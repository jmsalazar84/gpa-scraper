module.exports = {
  createRepository: async (type, filename) => {
    if (type === 'sqlite') {
      const repository = require('./sqlite.repository');
      await repository.setDatabase(filename);
      return repository;
    } else {
      throw new Error('Repository is not supported');
    }
  },

  createScraper: async (type) => {
    if (type === 'gphotos') {
      return require('./gphotos.scraper');
    } else {
      throw new Error('Scraper is not supported');
    }
  },

  createLogger: (service) => {
    const winston = require('winston');
    return winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service },
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({
          filename: './logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({ filename: './logs/combined.log' }),
      ],
    });
  },
};
