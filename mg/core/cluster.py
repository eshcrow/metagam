from mg import *
from concurrence import Timeout, TimeoutError
from concurrence.http import HTTPConnection, HTTPError, HTTPRequest
from urllib import urlencode
from uuid import uuid4
import json
import random

alphabet = "abcdefghijklmnopqrstuvwxyz"

class TempFile(CassandraObject):
    _indexes = {
        "till": [[], "till"],
        "wizard": [["wizard"]],
        "app": [["app"]],
    }

    def __init__(self, *args, **kwargs):
        kwargs["clsprefix"] = "TempFile-"
        CassandraObject.__init__(self, *args, **kwargs)

    def indexes(self):
        return TempFile._indexes

    def delete(self):
        host = str(self.get("host"))
        url = str(self.get("url"))
        uri = str(self.get("uri"))
        print "deleting static file %s" % uri
        cnn = HTTPConnection()
        cnn.connect((str(host), 80))
        try:
            request = HTTPRequest()
            request.method = "DELETE"
            request.path = url
            request.host = host
            cnn.perform(request)
        except (SystemExit, KeyboardInterrupt, TaskletExit):
            raise
        except:
            pass
        finally:
            cnn.close()

class TempFileList(CassandraObjectList):
    def __init__(self, *args, **kwargs):
        kwargs["clsprefix"] = "TempFile-"
        kwargs["cls"] = TempFile
        CassandraObjectList.__init__(self, *args, **kwargs)

class StaticUploadError(Exception):
    "Error uploading object to the static server"
    pass

class Cluster(Module):
    def register(self):
        Module.register(self)
        self.rhook("cluster.query_director", self.query_director)
        self.rhook("cluster.query_server", self.query_server)
        self.rhook("cluster.servers_online", self.servers_online)
        self.rhook("cluster.static_upload", self.static_upload)
        self.rhook("cluster.appconfig_changed", self.appconfig_changed)
        self.rhook("cluster.static_upload_temp", self.static_upload_temp)
        self.rhook("objclasses.list", self.objclasses_list)

    def query_director(self, uri, params={}):
        """
        Connect to Director and query given URI
        uri - URI
        params - HTTP form params
        Return value: received response (application/json will be decoded automatically)
        """
        return dir_query(uri, params)

    def query_server(self, host, port, uri, params={}):
        """
        Connect to an arbitrary server and query given URI
        host:port - server socket
        uri - URI
        params - HTTP form params
        Return value: received response (application/json will be decoded automatically)
        """
        return query(host, port, uri, params)

    def servers_online(self):
        """
        Returns list of internal servers currently online
        """
        config = self.app().inst.int_app.config
        config.clear()
        online = config.get("director.servers", {})
        if online is None:
            online = {}
        return online

    def upload(self, subdir, ext, content_type, data):
        host = str(random.choice(self.app().inst.config["storage"]))
        id = uuid4().hex
        url = str("/%s/%s/%s%s/%s-%s.%s" % (subdir, random.choice(alphabet), random.choice(alphabet), random.choice(alphabet), self.app().tag, id, ext))
        uri = str("http://" + host + url)
        cnn = HTTPConnection()
        cnn.connect((str(host), 80))
        try:
            request = HTTPRequest()
            request.method = "PUT"
            request.path = url
            request.host = host
            request.body = data
            request.add_header("Content-type", content_type)
            request.add_header("Content-length", len(request.body))
            response = cnn.perform(request)
            if response.status_code != 201:
                raise StaticUploadError(self._("Error storing object: %s") % response.status)
        finally:
            cnn.close()
        return (uri, url, host)

    def static_upload(self, subdir, ext, content_type, data):
        uri, url, host = self.upload(subdir, ext, content_type, data)
        return uri

    def static_upload_temp(self, subdir, ext, content_type, data, wizard=None):
        uri, url, host = self.upload(subdir, ext, content_type, data)
        data = {
            "uri": uri,
            "url": url,
            "host": host,
            "app": self.app().tag
        }
        if wizard is None:
            data["till"] = self.now(86400)
        else:
            data["wizard"] = wizard
        self.app().inst.int_app.obj(TempFile, data=data).store()
        return uri

    def appconfig_changed(self):
        tag = None
        try:
            tag = self.app().tag
        except AttributeError:
            pass
        if tag is not None:
            int_app = self.app().inst.int_app
            servers_online = self.servers_online()
            for server, info in servers_online.items():
                if info["type"] == "worker":
                    try:
                        int_app.hooks.call("cluster.query_server", info["host"], info["port"], "/core/appconfig/%s" % tag, {})
                    except HTTPError as e:
                        self.error(e)
                    except (KeyboardInterrupt, SystemExit, TaskletExit):
                        raise
                    except BaseException as e:
                        self.exception(e)
    
    def objclasses_list(self, objclasses):
        objclasses["TempFile"] = (TempFile, TempFileList)

def dir_query(uri, params):
    return query("director", 3000, uri, params)

def query(host, port, uri, params):
    try:
        with Timeout.push(20):
            cnn = HTTPConnection()
            try:
                cnn.connect((str(host), int(port)))
            except IOError as e:
                raise HTTPError("Error downloading http://%s:%s%s: %s" % (host, port, uri, e))
            try:
                request = cnn.post(str(uri), urlencode(params))
                request.add_header("Content-type", "application/x-www-form-urlencoded")
                response = cnn.perform(request)
                if response.status_code != 200:
                    raise HTTPError("Error downloading http://%s:%s%s: %s" % (host, port, uri, response.status))
                body = response.body
                if response.get_header("Content-type") == "application/json":
                    body = json.loads(body)
                return body
            finally:
                cnn.close()
    except TimeoutError:
        raise HTTPError("Timeout downloading http://%s:%s%s" % (host, port, uri))
