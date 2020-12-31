const sqlite3 = require('sqlite3');
const fs = require('fs');
const logger = require('./factory').createLogger('sqlite-repository');
let db = null;

const execute = async (cmd) => {
  logger.debug(`execute`, { cmd });
  return new Promise((resolve, reject) => {
    db.run(cmd, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const connect = async (filename) => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(
      filename,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

const createDB = async (filename) => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(
      filename,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

const initDb = async (filename) => {
  await createDB(filename);
  await execute('DROP TABLE IF EXISTS albums;DROP TABLE IF EXISTS photos;');
  await execute(
    'CREATE TABLE albums([id] NVARCHAR(100) NOT NULL,[name] NVARCHAR(120), [url] NVARCHAR(500))'
  );
  await execute(`
  CREATE TABLE photos(
    [id] NVARCHAR(100) NOT NULL,
    [albumId] NVARCHAR(100) NOT NULL,
    [url] NVARCHAR(255) NOT NULL,
    [name] NVARCHAR(255),
    [description] NVARCHAR(255),
    [createdAt] INTEGER,
    [size] INTEGER,
    [width] INTEGER,
    [height] INTEGER
  )`);
};

module.exports = {
  async setDatabase(dbFile) {
    try {
      if (!fs.existsSync(dbFile)) {
        logger.debug(`Initializing sqlite3 database`, { dbFile });
        await initDb(dbFile);
      }

      await connect(dbFile);
      logger.debug(`Using sqlite3 database`, { dbFile });
    } catch (err) {
      logger.error(err);
      process.exit;
    }
  },

  async getPhoto(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM photos WHERE id = ?;`;
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        return resolve(row);
      });
    });
  },

  async getAlbumById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM albums WHERE id = ?;`;
      db.get(sql, [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        return resolve(row);
      });
    });
  },

  async updateAlbum(id, updateAlbumDto) {
    const self = this;
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE albums SET url = ?, name = ? WHERE id = ?;`,
        [updateAlbumDto.url, updateAlbumDto.name, id],
        (err) => {
          if (err) {
            return reject(err);
          }
          const doc = self.getAlbumById(id);
          resolve(doc);
        }
      );
    });
  },

  async createAlbum(album) {
    const self = this;
    const id = album.id;
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO albums(
              id, 
              url,
              name
            ) VALUES(?,?,?)`,
        [album.id, album.url, album.name],
        function (error) {
          if (error) {
            return reject(error);
          }
          const doc = self.getAlbumById(id);
          resolve(doc);
        }
      );
    });
  },

  async createPhoto(album, photo) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO photos(
              albumId, 
              id, 
              url,
              name,
              description,
              createdAt,
              size,
              width,
              height
            ) VALUES(?,?,?,?,?,?,?,?,?)`,
        [
          album.id,
          photo.id,
          photo.url,
          photo.name,
          photo.description,
          photo.createdAt,
          photo.size,
          photo.width,
          photo.height,
        ],
        function (error) {
          if (error) {
            return reject(error);
          }
          resolve(this.lastID);
        }
      );
    });
  },
};
