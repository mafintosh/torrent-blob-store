var test = require('tape')
var blob = require('./')

require('abstract-blob-store/tests')(test, {
  setup: function (t, cb) {
    cb(null, blob())
  },
  teardown: function (t, store, blob, cb) {
    if (blob) store.remove(blob)
    cb()
  }
})
