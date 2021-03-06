#!/usr/bin/python2.6

# This file is a part of Metagam project.
#
# Metagam is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# any later version.
# 
# Metagam is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with Metagam.  If not, see <http://www.gnu.org/licenses/>.

from mg.constructor import *
import re
import mimetypes
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps, ImageFilter
import cStringIO

re_non_alphanumeric = re.compile(r'[^\w\-\.\(\)]')
re_find_extension = re.compile(r'^(.*)(\..*)$')
re_del = re.compile(r'^del\/(\S+)$')

class DBStaticObject(CassandraObject):
    clsname = "StaticObject"
    indexes = {
        "all": [[], "filename_lower"],
        "created": [[], "created"],
        "content_type": [["content_type"], "created"],
    }

class DBStaticObjectList(CassandraObjectList):
    objcls = DBStaticObject

class StorageAdmin(Module):
    def register(self):
        self.rhook("permissions.list", self.permissions_list)
        self.rhook("menu-admin-root.index", self.menu_root_index)
        self.rhook("menu-admin-storage.index", self.menu_storage_index)
        self.rhook("headmenu-admin-storage.static", self.headmenu_storage_static)
        self.rhook("ext-admin-storage.static", self.admin_storage_static, priv="storage.static")
        self.rhook("objclasses.list", self.objclasses_list)

    def objclasses_list(self, objclasses):
        objclasses["StaticObject"] = (DBStaticObject, DBStaticObjectList)

    def permissions_list(self, perms):
        perms.append({"id": "storage.static", "name": self._("Uploading static objects to the storage")})

    def menu_root_index(self, menu):
        menu.append({"id": "storage.index", "text": self._("Storage"), "order": 40})

    def menu_storage_index(self, menu):
        req = self.req()
        if req.has_access("storage.static"):
             menu.append({"id": "storage/static", "text": self._("Static objects"), "order": 10, "leaf": True})

    def headmenu_storage_static(self, args):
        if args == "new":
            return [self._("New object"), "storage/static"]
        else:
            return self._("Static storage")

    def admin_storage_static(self):
        req = self.req()
        m = re_del.match(req.args)
        if m:
            uuid = m.group(1)
            try:
                obj = self.obj(DBStaticObject, uuid)
                self.call("cluster.static_delete", obj.get("uri"))
                obj.remove()
            except ObjectNotFoundException:
                pass
            self.call("admin.redirect", "storage/static")
        self.call("admin.advice", {"title": self._("Storage documentation"), "content": self._('You can read detailed information on the static storage in <a href="//www.%s/doc/storage" target="_blank">the documentation</a>') % self.main_host})
        if req.args == "new":
            if req.ok():
                self.call("web.upload_handler")
                errors = {}
                ob = req.param_detail("ob")
                if ob is None or not ob.value:
                    errors["ob"] = self._("Upload your static object")
                else:
                    try:
                        filename = ob.filename.decode("utf-8")
                    except UnicodeDecodeError:
                        filename = u"unknown.file"
                    filename = re_non_alphanumeric.sub('_', filename)
                    # guessing extension
                    ext = mimetypes.guess_extension(ob.type, strict=True)
                    if ext == ".jpe":
                        ext = ".jpeg"
                    if ext:
                        m = re_find_extension.match(filename)
                        if m:
                            basename = m.group(1)
                        else:
                            basename = filename
                        filename = basename + ext
                    else:
                        m = re_find_extension.match(filename)
                        if m:
                            ext = m.group(2)
                    # size limits
                    if ext == ".swf" or ext == ".mp3":
                        max_size = 20
                    else:
                        max_size = 3
                    if len(ob.value) > max_size * 1024 * 1024:
                        errors["ob"] = self._("Maximal file size for this file type &mdash; %d megabytes") % max_size
                    elif len(ob.value) > 30 * 1024:
                        # certificate check
                        wmids = self.main_app().hooks.call("wmid.check", self.app().project.get("owner"))
                        if not wmids:
                            errors["ob"] = self._('To store static objects larger than 30 kb game owner must have a WMID attached to his account')
                        else:
                            lvl = 0
                            for wmid, cert in wmids.iteritems():
                                if cert > lvl:
                                    lvl = cert
                            if lvl < 120:
                                errors["ob"] = self._('To store static objects larger than 30 kb game owner\'s WMID must have the Initial certificate')
                    # constraints
                    if req.param("image"):
                        try:
                            image_obj = Image.open(cStringIO.StringIO(ob.value))
                            if image_obj.load() is None:
                                raise IOError
                        except IOError:
                            errors["ob"] = self._("Image format not recognized")
                        except OverflowError:
                            errors["ob"] = self._("Image format not recognized")
                        else:
                            if image_obj.format != "GIF" and image_obj.format != "JPEG" and image_obj.format != "PNG":
                                errors["ob"] = self._("This image format is not supported. Allowed are: GIF, JPEG, PNG")
                if errors:
                    self.call("web.response_json_html", {"success": False, "errors": errors})
                uri = self.call("cluster.static_upload", "userstore", None, ob.type, ob.value, filename)
                obj = self.obj(DBStaticObject)
                obj.set("filename", filename)
                obj.set("filename_lower", filename.lower())
                obj.set("created", self.now())
                obj.set("content_type", ob.type)
                obj.set("size", len(ob.value))
                obj.set("uri", uri)
                if req.param("group"):
                    obj.set("group", req.param("group"))
                obj.store()
                if req.param("image"):
                    width, height = image_obj.size
                    self.call("web.response_json_html", {"success": True, "uri": uri, "width": width, "height": height, "uuid": obj.uuid})
                self.call("admin.redirect", "storage/static")
            fields = [
                {"name": "ob", "type": "fileuploadfield", "label": self._("Upload an object")}
            ]
            self.call("admin.form", fields=fields, modules=["FileUploadField"])
        tables = {}
        group_names = {
            "_default": None,
        }
        self.call("admin-storage.group-names", group_names)
        nondeletable = set()
        self.call("admin-storage.nondeletable", nondeletable)
        lst = self.objlist(DBStaticObjectList, query_index="all")
        lst.load()
        for ent in lst:
            group = ent.get("group", "_default")
            if ent.get("size"):
                if ent.get("size") >= 1024 * 1024 * 0.1:
                    size = self._("%.1f Mb") % (ent.get("size") / (1024.0 * 1024.0))
                elif ent.get("size") >= 1024 * 0.1:
                    size = self._("%.1f Kb") % (ent.get("size") / (1024.0))
                else:
                    size = ent.get("size")
            else:
                size = None
            deletable = ent.uuid not in nondeletable
            try:
                table = tables[group]
            except KeyError:
                table = {
                    "title": group_names.get(group, htmlescape(group)),
                    "header": [
                        self._("File"),
                        self._("URI"),
                        self._("Size"),
                        self._("Content type"),
                        self._("Deletion"),
                    ],
                    "rows": []
                }
                tables[group] = table
            table["rows"].append([
                '<a href="{0}" target="_blank">{1}</a>'.format(ent.get("uri"), htmlescape(ent.get("filename"))),
                '<input class="admin-hscrolled" value="{0}" />'.format(ent.get("uri")),
                size,
                ent.get("content_type"),
                '<hook:admin.link href="storage/static/del/%s" title="%s" confirm="%s" />' % (ent.uuid, self._("delete"), self._("Are you sure want to delete this object?")) if deletable else self._("deletion///object is busy"),
            ])
        tables_list = [
            {
                "links": [
                    {"hook": "storage/static/new", "text": self._("Upload new object"), "lst": True},
                ],
            },
        ]
        tables = tables.items()
        tables.sort(cmp=lambda x, y: cmp(x[0], y[0]))
        for table in tables:
            tables_list.append(table[1])
        vars = {
            "tables": tables_list
        }
        self.call("admin.response_template", "admin/common/tables.html", vars)
