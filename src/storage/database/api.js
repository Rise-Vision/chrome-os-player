/* eslint-disable max-statements */

const database = require("./lokijs/database");

function allEntries(collection) {
  return database.getCollection(collection).find();
}

function clear(collection) {
  database.getCollection(collection).clear();
}

function setAll(collection, updateObj) {
  database.getCollection(collection)
  .findAndUpdate({}, (doc)=>Object.assign(doc, updateObj));
}

function deleteAllDataFor(filePath) {
  return Promise.all([
    module.exports.fileMetadata.delete(filePath),
    module.exports.watchlist.delete(filePath)
  ]);
}

module.exports = {
  getEntireDBObject: ()=>JSON.parse(database.serialize()),
  deleteAllDataFor,
  fileMetadata: {
    clear: ()=>clear("metadata"),
    allEntries: ()=>allEntries("metadata"),
    setAll: (updateObj)=>setAll("metadata", updateObj),
    find(filter) {
      return database.getCollection("metadata").find(filter);
    },
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const metadata = database.getCollection("metadata");
      const item = metadata.by("filePath", filePath);

      return field ? item && item[field] : item;
    },
    put(entry) {
      if (!entry || !entry.filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("metadata");

        let item = metadata.by("filePath", entry.filePath);

        if (!item) {
          item = metadata.insert({filePath: entry.filePath});
        }

        Object.assign(item, entry);
        try {
          metadata.update(item);
        } catch (err) {
          rej(err);
        }

        res(entry);
      });
    },
    getFolderFiles(folderPath) {
      return database.getCollection("metadata").where(entry => {
        return entry.filePath.startsWith(folderPath) && !entry.filePath.endsWith("/");
      })
    },
    getAllFolders() {
      return database.getCollection("metadata").where(entry => {
        return entry.filePath.endsWith("/");
      })
    },
    isVersionMismatch(filePath, version) {
      const entry = database.getCollection("metadata").by("filePath", filePath);

      if (!entry) {return true;}
      if (!entry.version) {return true;}

      return entry.version !== version;
    },
    getStale: ()=>database.getCollection("metadata").find({status: "STALE"}),
    delete(filePath) {
      if (!filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const metadata = database.getCollection("metadata");
        const item = metadata.by("filePath", filePath);

        if (item) {
          try {
            metadata.remove(item);
          } catch (err) {
            rej(err);
          }
        }

        res();
      });
    },
    updateWatchSequence(filePath) {
      const metadata = module.exports.fileMetadata.get(filePath);

      if (!metadata) {
        return Promise.reject(Error(`filePath not in local database ${filePath}`));
      }

      const watchSequence = module.exports.watchlist.runtimeSequence();

      return module.exports.fileMetadata.put({filePath, watchSequence});
    }
  },
  watchlist: {
    clear() {
      clear("watchlist");
      clear("runtime_info");
    },
    allEntries: ()=>allEntries("watchlist"),
    get(filePath, field = "") {
      if (!filePath) {throw Error("missing params");}

      const watchlist = database.getCollection("watchlist");
      const item = watchlist.by("filePath", filePath);

      return field ? item && item[field] : item;
    },
    delete(filePath) {
      if (!filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const watchlist = database.getCollection("watchlist");
        const item = watchlist.by("filePath", filePath);

        if (item) {
          try {
            watchlist.remove(item);
          } catch (err) {
            rej(err);
          }
        }

        res();
      });
    },
    put(entry) {
      if (!entry) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const watchlist = database.getCollection("watchlist");

        let item = watchlist.by("filePath", entry.filePath);

        if (!item) {
          item = watchlist.insert({filePath: entry.filePath});
        }

        item.version = entry.version;

        try {
          watchlist.update(item);
        } catch (err) {
          rej(err);
        }

        res();
      });
    },
    runtimeInfo() {
      const entries = allEntries("runtime_info");

      if (entries.length > 0) {
        return entries[0];
      }

      const runtimeInfo = database.getCollection("runtime_info");
      return runtimeInfo.insert({lastChanged: '0', runtimeSequence: 1});
    },
    setParameter(key, value) {
      const runtimeInfo = module.exports.watchlist.runtimeInfo();

      const entry = {
        lastChanged: runtimeInfo.lastChanged,
        runtimeSequence: runtimeInfo.runtimeSequence,
        [key]: value
      };

      setAll("runtime_info", entry);
    },
    lastChanged() {
      return module.exports.watchlist.runtimeInfo().lastChanged;
    },
    setLastChanged(lastChanged = "0") {
      const previous = module.exports.watchlist.lastChanged();

      if (Number(previous) >= Number(lastChanged)) {
        return;
      }

      module.exports.watchlist.setParameter('lastChanged', lastChanged);
    },
    runtimeSequence() {
      return module.exports.watchlist.runtimeInfo().runtimeSequence;
    },
    increaseRuntimeSequence() {
      const currentSequence = module.exports.watchlist.runtimeSequence();
      const nextSequence = currentSequence + 1;

      module.exports.watchlist.setParameter('runtimeSequence', nextSequence);

      return nextSequence;
    }
  },
  expired: {
    clear: ()=>clear("expired"),
    allEntries: ()=>allEntries("expired"),
    put(filePath) {
      if (!filePath) {throw Error("missing params");}

      return new Promise((res, rej)=>{
        const expired = database.getCollection("expired");

        let item = expired.by("filePath", filePath);

        if (!item) {
          item = expired.insert({filePath});
        }

        try {
          expired.update(item);
        } catch (err) {
          rej(err);
        }

        res();
      });
    }
  }

};
