/* eslint-disable consistent-return */
/*
Functions to convert username to uuid and cache them.
Returns non-dashed uuid or an error.
*/
const config = require('../config');
const { removeDashes, getData } = require('../util/utility');
const cachedFunction = require('./cachedFunction');
const redis = require('./redis');

async function getUUID(name) {
  if ((/^[\da-f]{32}$/i).test(removeDashes(name))) {
    return removeDashes(name);
  }

  if (!(/^\w{1,16}$/i).test(name)) {
    throw new Error('Invalid username or UUID!');
  }

  return cachedFunction(`uuid:${name.toLowerCase()}`, async () => {
    const weightedEndpoints = {
      'https://playerdb.co/api/player/minecraft/': 0.6,
      'https://api.ashcon.app/mojang/v1/user/': 0.4,
    };

    let i; let j; const table = [];
    for (i in weightedEndpoints) {
      for (j = 0; j < weightedEndpoints[i] * 10; j++) {
        table.push(i);
      }
    }

    const url = table[Math.floor(Math.random() * table.length)] + name;

    const response = await getData(redis, url);
    if (!response) {
      throw new Error('Invalid username!');
    }

    if (url.startsWith('https://playerdb.co/')) {
      const { data } = response;
      return data.player.raw_id;
    }

    if (url.startsWith('https://api.ashcon.app/')) {
      const { uuid } = response;
      return removeDashes(uuid);
    }
  }, { cacheDuration: config.UUID_CACHE_SECONDS, shouldCache: config.ENABLE_UUID_CACHE });
}

module.exports = getUUID;
