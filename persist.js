Persist = (function() {
  var VERSION = '0.1.0', P, B, esc, init, empty, ec;

  // easycookie 0.2.1 (http://pablotron.org/software/easy_cookie/)
  ec = (function(){var EPOCH='Thu, 01-Jan-1970 00:00:01 GMT',RATIO=1000*60*60*24,KEYS=['expires','path','domain'],esc=escape,un=unescape,doc=document,me;var get_now=function(){var r=new Date();r.setTime(r.getTime());return r;}
var cookify=function(c_key,c_val){var i,key,val,r=[],opt=(arguments.length>2)?arguments[2]:{};r.push(esc(c_key)+'='+esc(c_val));for(i=0;i<KEYS.length;i++){key=KEYS[i];if(val=opt[key])
r.push(key+'='+val);}
if(opt.secure)
r.push('secure');return r.join('; ');}
var alive=function(){var k='__EC_TEST__',v=new Date();v=v.toGMTString();this.set(k,v);this.enabled=(this.remove(k)==v);return this.enabled;}
me={set:function(key,val){var opt=(arguments.length>2)?arguments[2]:{},now=get_now(),expire_at,cfg={};if(opt.expires){opt.expires*=RATIO;cfg.expires=new Date(now.getTime()+opt.expires);cfg.expires=cfg.expires.toGMTString();}
var keys=['path','domain','secure'];for(i=0;i<keys.length;i++)
if(opt[keys[i]])
cfg[keys[i]]=opt[keys[i]];var r=cookify(key,val,cfg);doc.cookie=r;return val;},has:function(key){key=esc(key);var c=doc.cookie,ofs=c.indexOf(key+'='),len=ofs+key.length+1,sub=c.substring(0,key.length);return((!ofs&&key!=sub)||ofs<0)?false:true;},get:function(key){key=esc(key);var c=doc.cookie,ofs=c.indexOf(key+'='),len=ofs+key.length+1,sub=c.substring(0,key.length),end;if((!ofs&&key!=sub)||ofs<0)
return null;end=c.indexOf(';',len);if(end<0)
end=c.length;return un(c.substring(len,end));},remove:function(k){var r=me.get(k),opt={expires:EPOCH};doc.cookie=cookify(k,'',opt);return r;},keys:function(){var c=doc.cookie,ps=c.split('; '),i,p,r=[];for(i=0;i<ps.length;i++){p=ps[i].split('=');r.push(un(p[0]));}
return r;},all:function(){var c=doc.cookie,ps=c.split('; '),i,p,r=[];for(i=0;i<ps.length;i++){p=ps[i].split('=');r.push([un(p[0]),un(p[1])]);}
return r;},version:'0.2.1',enabled:false};me.enabled=alive.call(me);return me;}());

  // empty function
  empty = function() { };

  // escape spaces in name
  esc = function(str) {
    return 'PS' + str.replace(/_/g, '__').replace(/ /g, '_s');
  }

  B = {
    /* 
     * Backend search order.
     * 
     * Note that the search order is significant; the backends are
     * listed in order of capacity, and many browsers
     * support multiple backends, so changing the search order could
     * result in a browser choosing a less capable backend.
     */ 
    search_order: [
      // TODO: flash, gears, whatwg localStorage
      'db', 
      'dom', 
      'ie', 
      'cookie'
    ],

    // list of backend methods
    methods: [
      'init', 
      'get', 
      'set', 
      'remove', 
      'load', 
      'save'
    ],

    // whatwg db backend (Safari 3.1+)
    db: {
      size:   200 * 1024,

      sql: {
        create: "CREATE TABLE persist_data (k TEXT UNIQUE, v TEXT)",
        get:    "SELECT v FROM persist_data WHERE k = ?",
        set:    "INSERT INTO persist_data(k, v) VALUES (?, ?)",
        remove: "DELETE FROM persist_data WHERE k = ?" 
      },
       
      test: function() {
        // test for openDatabase
        if (!window.openDatabase)
          return false;

        // make sure openDatabase works
        // XXX: will this leak a db handle and/or waste space?
        if (!window.openDatabase('PersistJS Test', '', '', B.db.size))
          return false;

        return true;
      },

      methods: {
        transaction: function(fn) {
          if (!this.db_created) {
            var sql = B.db.sql.create;

            this.db.transaction(function(t) {
              // create table
              t.executeSql(sql, [], function() {
                this.db_created = true;
              });
            });
          } 

          this.db.transaction(fn);
        },

        init: function() {
          var desc, size; 
          
          // init description and size
          desc = this.o.description || "Persistent storage for " + this.name;
          size = this.o.size || B.db.size;

          // create database handle
          this.db = openDatabase(this.name, this.o.version || '', desc, size);
        },

        get: function(key, fn, scope) {
          var sql = B.db.sql.get;

          // if callback isn't defined, then return
          if (!fn)
            return;

          // get callback scope
          scope = scope || this;

          // begin transaction
          this.transaction(function (t) {
            t.executeSql(sql, [key], function(r) {
              if (r.rows.length > 0)
                fn.call(scope, true, r.rows.item(0)['v']);
              else
                fn.call(scope, false, null);
            });
          });
        },

        set: function(key, val, fn, scope) {
          var rm_sql = B.db.sql.remove,
              sql    = B.db.sql.set;
          scope = scope || this;

          // begin set transaction
          this.transaction(function(t) {
            // exec remove query
            t.executeSql(rm_sql, [key], function() {
              // exec set query
              t.executeSql(sql, [key, val], function(r) {
                // run callback
                if (fn)
                  fn.call(scope, true, val);
              });
            });
          });

          return val;
        },

        // begin remove transaction
        remove: function(key, fn, scope) {
          var get_sql = this.sql.get;
              sql = this.sql.remove;

          this.transaction(function(t) {
            // if a callback was defined, then get the old
            // value before removing it
            if (fn) {
              // exec get query
              t.executeSql(get_sql, [key], function(r) {
                if (r.rows.length > 0) {
                  // key exists, get value 
                  var val = r.rows.item(0)['v'];

                  // exec remove query
                  t.executeSql(sql, [key], function(r) {
                    // exec callback
                    fn.call(scope, true, val);
                  });
                } else {
                  // key does not exist, exec callback
                  fn.call(scope, false, null);
                }
              });
            } else {
              // no callback was defined, so just remove the
              // data without checking the old value

              // exec remove query
              t.executeSql(sql, [key]);
            }
          });
        } 
      }
    }, 
    
    // dom backend (globalStorage, FF2+, IE8+)
    dom: {
      test: function() {
        return window.globalStorage ? true : false;
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        get: function(key, fn, scope) {
          // expand key and get scope
          key = this.key(key);
          scope = scope || this;

          if (fn)
            fn.call(scope, true, globalStorage[this.o.domain][key]);
        },

        set: function(key, val, fn, scope) {
          // expand key and get scope
          key = this.key(key);
          scope = scope || this;

          globalStorage[this.o.domain][key] = val;

          if (fn)
            fn.call(scope, true, val);
        },

        remove: function(key, fn, scope) {
          var val;

          // expand key and get scope
          key = this.key(key);
          scope = scope || this;

          // get old value
          val = globalStorage[this.o.domain][key];
          delete globalStorage[this.o.domain][key];

          if (fn)
            fn.call(scope, (val !== null), val);
        } 
      }
    }, 
    
    // IE backend
    ie: {
      prefix: '_persist_data-',
      style: 'display:none; behavior:url(#default#userdata)',

      test: function() {
        // TODO: test load/save
        return document.attachEvent ? true : false;
      },

      methods: {
        init: function() {
          var id = B.ie.prefix + esc(this.name);

          // lazy-load userdata element
          var el = document.createElement('div');
          el.setAttribute('id', id);
          el.setAttribute('className', 'userData');
          el.setAttribute('style', B.ie.style);

          // append element to body
          document.body.appendChild(el);

          // save element and load data
          this.el = el;
          this.load();
        },

        load: function() {
          if (this.o.defer)
            this.el.load(esc(this.name));
        },

        get: function(key, fn, scope) {
          var val;

          // expand key
          key = esc(key);

          // load data
          if (!this.o.defer)
            this.el.load(esc(this.name));

          // get value
          val = this.el.getAttribute(key);

          // call fn
          if (fn)
            fn.call(scope || this, true, val);
        },

        set: function(key, val, fn, scope) {
          // expand key
          key = esc(key);
          
          // set attribute
          this.el.setAttribute(key, val);
          if (!this.o.defer)
            this.el.save(esc(this.name));

          if (fn)
            fn.call(scope || this, true, val);
        },

        save: function() {
          if (this.o.defer) {
            // flush changes
            this.el.save(esc(this.name));
          }
        }
      }
    },

    // cookie backend
    cookie: {
      delim: ':',

      test: function() {
        // XXX: use easycookie to test if cookies are enabled
        return P.Cookie.enabled ? true : false;
      },

      methods: {
        key: function(key) {
          return this.name + B.cookie.delim + key;
        },

        get: function(key, val, fn, scope) {
          // expand key 
          key = this.key(key);

          // get value
          val = ec.get(key);

          // call fn
          if (fn)
            fn.call(scope || this, val != null, val);
        },

        set: function(key, val, fn, scope) {
          // expand key 
          key = this.key(key);

          // save value
          ec.set(key, val, this.o);

          // call fn
          if (fn)
            fn.call(scope || this, true, val);
        },

        remove: function(key, val, fn, scope) {
          var val;

          // expand key 
          key = this.key(key);

          // remove cookie
          val = ec.remove(key)

          // call fn
          if (fn)
            fn.call(scope || this, val != null, val);
        } 
      }
    }
  };

  // init function
  var init = function() {
    var i, l, b, key, fns = B.methods, keys = B.search_order;

    // set all functions to the empty function
    for (i = 0, l = fns.length; i < l; i++) 
      P.Store.prototype[fns[i]] = empty;

    // clear type
    P.type = null;

    // loop over all backends and test for each one
    for (i = 0, l = keys.length; !P.type && i < l; i++) {
      b = B[keys[i]];

      // test for backend
      if (b.test()) {
        // found backend, save type
        P.type = keys[i];

        // extend store prototype with backend methods
        for (key in b.methods)
          P.Store.prototype[key] = b.methods[key];
      }
    }
  };

  // create top-level namespace
  P = {
    // version of persist library
    VERSION: VERSION,

    // backend type
    type: null,

    add: function(o) {
      // add to backend hash
      B[o.id] = o;

      // add backend to front of search order
      B.search_order = [o.id].concat(B.search_order);

      // re-initialize library
      init();
    },

    remove: function(id) {
      var ofs = B.search_order.indexOf(id);
      if (ofs < 0)
        return;

      // remove from search order
      B.search_order.splice(ofs, 1);

      // delete from lut
      delete B[id];

      // re-initialize library
      init();
    },

    // expose easycookie API
    Cookie: ec,

    // store API
    Store: function(name, o) {
      if (!P.type)
        throw new Error("No suitable storage found");

      o = o || {};
      this.name = name;

      // XXx: does this work?
      o.domain = o.domain || location.hostname || 'localdomain';
      this.o = o;

      // expires in 2 years
      o.expires = o.expires || 365 * 2;

      // call init function
      this.init();
    } 
  };

  // init perssist and return top-level namespace
  init();
  return P;
})();
