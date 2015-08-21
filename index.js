var torrents = require('torrent-stream')
var duplexify = require('duplexify')
var createTorrent = require('create-torrent')
var parseTorrent = require('parse-torrent')
var fs = require('fs');
var path = require('path');
var tmpdir = require('osenv').tmpdir();
var mkdirp = require('mkdirp')
var once = require('once')
var xtend = require('xtend')
var crypto = require('crypto')

var TorrentBlobs = function(opts) {
  if (!(this instanceof TorrentBlobs)) return new TorrentBlobs(opts)
  this._options = opts || {}
  this._engines = {}
}

TorrentBlobs.prototype.createReadStream = function(opts) {
  if (typeof opts === 'string') opts = {key:opts}
  var result = duplexify()

  this._getFile(opts, function(file) {
    result.setReadable(file.createReadStream(opts))
  })

  result.setWritable(false)
  return result
}

TorrentBlobs.prototype.exists = function(opts, cb) {
  if (typeof opts === 'string') opts = {key:opts}
  this._getFile(opts, function(file) {
    cb(null, !!file)
  })
}

TorrentBlobs.prototype.createWriteStream = function(opts, cb) {
  var self = this
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  cb = once(cb || function () {})
  if (opts.trackers && !opts.announceList) {
    opts.announceList = opts.trackers
      .map(function (x) { return Array.isArray(x) ? x : [x] })
  }
 
  var file = opts.path || path.join(tmpdir, opts.name || nonce(16), 'file')
  var result = duplexify()
  if (cb) result.on('error', cb)

  mkdirp(path.dirname(file), function (err) {
    if (err) return cb(err)
    var fw = fs.createWriteStream(file)
    fw.on('error', cb)
    fw.once('finish', function () {
      createTorrent(file, opts, ontorrent)
    })
    result.setWritable(fw)
  })

  result.setReadable(false)
  return result

  function ontorrent(err, tdata) {
    if (err) return cb(err)
 
    result.torrent = tdata
    result.torrentInfo = parseTorrent(tdata)
    result.link = parseTorrent.toMagnetURI(result.torrentInfo)
    result.key = result.link
    result.path = file
 
    seed(tdata)
  }

  function seed (tdata) {
    var opts = xtend(self._options, { path: path.dirname(file) })
    var e = (opts.engine || torrents)(tdata, opts)
    var pending = 2
    e.once('ready', function () {
      for (var i = 0; i < e.torrent.pieces.length; i++) {
        if (!e.bitfield.get(i)) {
          result.emit('error', new Error('missing files'))
        }
      }
      ready()
    })
    e.listen(0, ready)
 
    function ready () {
      if (-- pending === 0) return
      self._addEngine(result.link, e)
      cb(null, result)
    }
  }
}

TorrentBlobs.prototype.remove = function(opts, cb) {
  //throw new Error('torrent-blob-store is read-only')
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  if (cb) cb(null)
}

TorrentBlobs.prototype.destroy = function() {
  var self = this
  Object.keys(this._engines).forEach(function(key) {
    self._engines[key].destroy()
  })
}

TorrentBlobs.prototype._getFile = function(opts, cb) {
  if (!opts.name && !opts.index) opts.index = 0

  var engine = this._getEngine(opts.link || opts.key)
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

  var e = torrents(link, this._options)
  this._addEngine(link, e)
  return e
}

TorrentBlobs.prototype._addEngine = function(link, e) {
  var self = this
  this._engines[link] = e

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

function nonce (n) { return crypto.randomBytes(n).toString('hex') }
