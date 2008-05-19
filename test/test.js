
Test = {
  get: function(id) {
    return document.getElementById(id);
  },

  load: function() {
    Test.store.get('some_key', function(ok, val) {
      if (ok)
        Test.get('data').value = val;
    });
  },

  save: function() {
    var val = Test.get('data').value;
    Test.store.set('some_key', val);
  },

  init: function() {
    // create new persistent store
    Test.store = new Persist.Store('test');

    // attach callbacks
    Test.get('load-btn').onclick = Test.load;
    Test.get('save-btn').onclick = Test.save;
  }
};
