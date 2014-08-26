var torrents = require('torrent-stream')
var duplexify = require('duplexify')

var TorrentBlobs = function(opts) {
  if (!(this instanceof TorrentBlobs)) return new TorrentBlobs(opts)
  this._options = opts || {}
  this._engines = {}
}

TorrentBlobs.prototype.createReadStream = function(opts) {
  var result = duplexify()

  this._getFile(opts, function(file) {
    result.setReadable(file.createReadStream(opts))
  })

  result.setWritable(false)
  return result
}

TorrentBlobs.prototype.exists = function(opts, cb) {
  this._getFile(opts, function(file) {
    cb(null, !!file)
  })
}

TorrentBlobs.prototype.createWriteStream = function() {
  throw new Error('torrent-blob-store is read-only')
}

TorrentBlobs.prototype.destroy = function() {
  var self = this
  Object.keys(this._engines).forEach(function(key) {
    self._engines[key].destroy()
  })
}

TorrentBlobs.prototype._getFile = function(opts, cb) {
  if (!opts.name && !opts.index) opts.index = 0

  var engine = this._getEngine(opts.link)
  var ready = function() {
    for (var i = 0; i < engine.files.length; i++) {
      var file = engine.files[i]
      if (opts.index === i || opts.name === file.name) {
        file.select()
        if (engine.files[i+1]) engine.files[i+1].select() // also select next file for latency optimization
        return cb(file)
      }
    }
    cb(null)
  }

  if (engine.torrent) {
    process.nextTick(function() {
      ready(engine)
    })
  } else {
    engine.on('ready', function() {
      ready(engine)
    })
  }
}

TorrentBlobs.prototype._getEngine = function(link) {
  if (!link) throw new Error('link is required')
  if (this._engines[link]) return this._engines[link]

  var e = this._engines[link] = torrents(link, this._options)

  var destroy = function() {
    delete self._engines[link]
    e.destroy()
  }

  e.on('uninterested', function() {
    var timeout = setTimeout(destroy, 5000)
    if (timeout.unref) timeout.unref()

    e.once('interested', function() {
      clearTimeout(timeout)
    })
  })

  return e
}

module.exports = TorrentBlobs