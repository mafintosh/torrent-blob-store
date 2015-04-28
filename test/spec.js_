var test = require('tape')
var Tracker = require('bittorrent-tracker').Server
var blob = require('./')

require('abstract-blob-store/tests')(test, {
  setup: function (t, cb) {
 
    var server = new Tracker({ http: true })
    server.listen(0, '127.0.0.1', function () {
      cb(null, blob({
        trackers: [
          'http://localhost:' + server.http.address().port,
          'udp://localhost:' + server.udp.address().port
        ]
      }))
    })
  },
  teardown: function (t, store, blob, cb) {
    if (blob) store.remove(blob)
    cb()
  }
})
