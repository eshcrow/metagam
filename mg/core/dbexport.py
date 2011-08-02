from mg import *

class DBExport(CassandraObject):
    _indexes = {
        "all": [[], "stored"],
    }

    def __init__(self, *args, **kwargs):
        kwargs["clsprefix"] = "Export-"
        CassandraObject.__init__(self, *args, **kwargs)

    def indexes(self):
        return DBExport._indexes

class DBExportList(CassandraObjectList):
    def __init__(self, *args, **kwargs):
        kwargs["clsprefix"] = "Export-"
        kwargs["cls"] = DBExport
        CassandraObjectList.__init__(self, *args, **kwargs)

class Export(Module):
    def register(self):
        Module.register(self)
        self.rhook("dbexport.add", self.add)
        self.rhook("int-dbexport.get", self.get, priv="public")
        self.rhook("int-dbexport.delete", self.delete, priv="public")

    def add(self, tp, **data):
        obj = self.int_app().obj(DBExport)
        for key, val in data.iteritems():
            obj.set(key, val)
        obj.set("app", self.app().tag)
        obj.set("type", tp)
        obj.set("stored", self.now())
        obj.store()

    def get(self):
        with self.lock(["DBExport"]):
            lst = self.objlist(DBExportList, query_index="all", query_limit=1000)
            lst.load(silent=True)
            self.call("web.response_json", lst.data())

    def delete(self):
        req = self.req()
        with self.lock(["DBExport"]):
            self.objlist(DBExportList, uuids=req.param("uuids").split(",")).remove()
            self.call("web.response_json", {"ok": True})