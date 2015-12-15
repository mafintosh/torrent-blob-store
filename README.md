# torrent-blob-store

BitTorrent backed streaming [blob store](https://github.com/maxogden/abstract-blob-store), both read and write supported.

```
npm install torrent-blob-store
```

[![blob-store-compatible](https://raw.githubusercontent.com/maxogden/abstract-blob-store/master/badge.png)](https://github.com/maxogden/abstract-blob-store)

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

## Write

Torrent-blob store also lets you createWriteStream and provides you with a magnet link.

```js
var Tracker = require('bittorrent-tracker').Server
var blob = require('torrent-blob-store')
var server = new Tracker({ http: true })
var concat = require('concat-stream')

server.listen(0, '127.0.0.1', function () {
	var store = blob({
    trackers: [
      'http://localhost:' + server.http.address().port,
      'udp://localhost:' + server.udp.address().port
    ]
  })
	var w = store.createWriteStream(function (err, res) {
		console.log(res.link) // will print out the magnet link
	  store.createReadStream(res.link).pipe(concat(function (body) {
	    console.log(body.toString()) // will print 'whatever'
	  }))
	})
	w.end('whatever')
})

```

## License

MIT
