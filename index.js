#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;
const path = require("path");


let url = null;
let repo = 'sqlite';
let filename = `${__dirname}/data/albums.db`;

if (argv.url) {
  url = argv.url;
} else {
  console.log('ERROR: Provide the shared url');
  process.exit(1);
}

if (argv.repo === 'sqlite') {
    repo = 'sqlite';
  if (argv.filename) {
    filename = path.resolve(`${argv.filename}`);
  } else {
    console.log('Provide the sqlite db filename');
    process.exit(1);    
  }
} else {
  console.log('Provide the repository type [sqlite]');
  process.exit(1);
}

const factory = require('./src/factory');


(async () => {
  const repository = await factory.createRepository(repo, filename);
  const scraper = await factory.createScraper('gphotos');
  await scraper.start(url, repository);
})();
