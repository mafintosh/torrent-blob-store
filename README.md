# torrent-blob-store

Read-only BitTorrent backed streaming [blob store](https://github.com/maxogden/abstract-blob-store)

```
npm install torrent-blob-store
```

## Usage

``` js
var torrents = require('torrent-blob-store')
var store = torrents()

// create a read stream to some star trek fan fiction
var rs = store.createReadStream({
  link: 'magnet:?xt=urn:btih:ef330b39f4801d25b4245212e75a38634bfc856e',
  index: 1 // get the file at index 1
})

rs.on('data', function(data) {
  console.log('received:', data) // data received from peers
})

rs.on('end', function() {
  console.log('(no more data)')
})
```

You can pass in the same options in the blob store constructor as in [torrent-stream](https://github.com/mafintosh/torrent-stream).
All read streams needs `link` to be set. Currently only magnet links are supported

## License

MIT
