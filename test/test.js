
Test = {
  get: function(id) {
    return document.getElementById(id);
  },

  load: function() {
    Test.get('data').value = Test.store.get('some_key' );
  },

  save: function() {
    var val = Test.get('data').value;
    Test.store.set('some_key', val);
  },

  load2: function() {
    Test.get('data2').value = Test.store2.get('some_key' )
  },

  save2: function() {
    var val = Test.get('data2').value;
    Test.store2.set('some_key', val);
  },

  init: function() {
    // create new persistent store
    Test.store = new Persist.Store('test', {
      swf_path: '../persist.swf'
    });
    Test.store2 = new Persist.Store('test2', {
      swf_path: '../persist.swf'
    });

    Test.get('type').innerHTML = Persist.type;

    // attach callbacks
    Test.get('load-btn').onclick = Test.load;
    Test.get('save-btn').onclick = Test.save;

    // attach callbacks
    Test.get('load2-btn').onclick = Test.load2;
    Test.get('save2-btn').onclick = Test.save2;

    Test.get('iterate-btn').onclick = function() {
      Test.store2.iterate(function(k,v) {
          alert(k + " = " + v);
          });
    }
  }
};
