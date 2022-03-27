const axios = require('axios')

const categories = {
  all: '',
  audio: '100',
  video: '200',
  applications: '300',
  games: '400',
  porn: '500',
  other: '600',
  top100: 'url:/top/all'
}

const humanizeSize = (bytes => {
  const thresh = 1000;
  if (bytes < thresh) {
    return `${bytes} B`;
  }
  const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (bytes >= thresh);
  return `${bytes.toFixed(1)} ${units[u]}`;
})

const formatMagnet = (infoHash, name) => {
  const trackers = [
    'udp://tracker.coppersurfer.tk:6969/announce',
    'udp://9.rarbg.to:2920/announce',
    'udp://tracker.opentrackr.org:1337',
    'udp://tracker.internetwarriors.net:1337/announce',
    'udp://tracker.leechers-paradise.org:6969/announce',
    'udp://tracker.pirateparty.gr:6969/announce',
    'udp://tracker.cyberia.is:6969/announce'
  ];
  const trackersQueryString = `&tr=${trackers.map(encodeURIComponent).join('&tr=')}`;
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}${trackersQueryString}`;
}

module.exports = async () => {

  const getTorrents = async (params) => {
    params = Object.keys(params).map((key) => `${key}=${params[key]}`).join('&')
    const result = await axios.get(`https://apibay.org/q.php?${params}`)
    const torrents = result.data
    for (const torrent of torrents) {
      torrent.magnet = formatMagnet(torrent.info_hash, torrent.name)
      torrent.size = humanizeSize(torrent.size)
    }
    return torrents
  }

  return {
    getTorrents,
    categories,
  }
}