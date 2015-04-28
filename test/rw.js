var test = require('tape');
var Tracker = require('bittorrent-tracker').Server
var blob = require('../')
var concat = require('concat-stream')

test('rw', function (t) {
  t.plan(3)
  t.once('end', function () {
    server.http.close()
    server.udp.close()
  })
 
  var server = new Tracker({ http: true })
  server.listen(0, '127.0.0.1', function () {
    var store = blob({
      trackers: [
        'http://localhost:' + server.http.address().port,
        'udp://localhost:' + server.udp.address().port
      ]
    })
    var w = store.createWriteStream(function (err, res) {
      t.ifError(err)
      t.ok(/^magnet:/.test(res.link), 'magnet link')
      store.createReadStream(res.link).pipe(concat(function (body) {
        t.equal(body.toString(), 'whatever')
      }))
    })
    w.end('whatever')
  })
})
