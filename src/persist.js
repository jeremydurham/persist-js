//
// Copyright (c) 2008, 2009 Paul Duncan (paul@pablotron.org)
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//


/* 
 * The contents of gears_init.js; we need this because Chrome supports
 * Gears out of the box, but still requires this constructor.  Note that
 * if you include gears_init.js then this function does nothing.
 */
(function() {
  // We are already defined. Hooray!
  if (window.google && google.gears){
      return;
  }

  // factory 
  var F = null;

  // Firefox
  if (typeof GearsFactory != 'undefined') {
    F = new GearsFactory();
  } else {
    // IE
    try {
      F = new ActiveXObject('Gears.Factory');
      // privateSetGlobalObject is only required and supported on WinCE.
      if (F.getBuildInfo().indexOf('ie_mobile') != -1){
          F.privateSetGlobalObject(this);
      }
        
    } catch (e) {
      // Safari
      if ((typeof navigator.mimeTypes != 'undefined') && navigator.mimeTypes["application/x-googlegears"]) {
        F = document.createElement("object");
        F.style.display = "none";
        F.width = 0;
        F.height = 0;
        F.type = "application/x-googlegears";
        document.documentElement.appendChild(F);
      }
    }
  }

  // *Do not* define any objects if Gears is not installed. This mimics the
  // behavior of Gears defining the objects in the future.
  if (!F){
      return;
  }
    

  // Now set up the objects, being careful not to overwrite anything.
  //
  // Note: In Internet Explorer for Windows Mobile, you can't add properties to
  // the window object. However, global objects are automatically added as
  // properties of the window object in all browsers.
  if (!window.google){
      google = {};
  }

  if (!google.gears){
      google.gears = {factory: F};
  }
    
})();

/**
 * Persist - top-level namespace for Persist library.
 * @namespace
 */
Persist = (function() {
  var VERSION = '0.3.1', P, B, esc, init, empty, ec;
  
  ec = (function() {
    var EPOCH = 'Thu, 01-Jan-1970 00:00:01 GMT',
        // milliseconds per day
        RATIO = 1000 * 60 * 60 * 24,
        // keys to encode 
        KEYS = ['expires', 'path', 'domain'],
        // wrappers for common globals
        esc = escape, un = unescape, doc = document,
        me; 

    // private methods

    /*
     * Get the current time.
     *
     * This method is private.
     */
    var get_now = function() {
      var r = new Date();
      r.setTime(r.getTime());
      return r;
    };

    /*
     * Convert the given key/value pair to a cookie.
     *
     * This method is private.
     */
    var cookify = function(c_key, c_val /*, opt */) {
       var i, key, val, r = [],
           opt = (arguments.length > 2) ? arguments[2] : {};

      // add key and value
      r.push(esc(c_key) + '=' + esc(c_val));

      // iterate over option keys and check each one
      for (var idx = 0; idx < KEYS.length; idx++) {
        key = KEYS[idx];
        val = opt[key];
        if (val){
            r.push(key + '=' + val);
        }
          
      }

      // append secure (if specified)
      if (opt.secure){
          r.push('secure');
      }

      // build and return result string
      return r.join('; ');
    };

    /*
     * Check to see if cookies are enabled.
     *
     * This method is private.
     */
    var alive = function() {
      var k = '__EC_TEST__', 
          v = new Date();

      // generate test value
      v = v.toGMTString();

      // set test value
      this.set(k, v);

      // return cookie test
      this.enabled = (this.remove(k) == v);
      return this.enabled;
    };

    // public methods

    // build return object
    me = {
      /*
       * Set a cookie value.
       *
       * Examples:
       *
       *   // simplest-case
       *   EasyCookie.set('test_cookie', 'test_value');
       *
       *   // more complex example
       *   EasyCookie.set('test_cookie', 'test_value', {
       *     // expires in 13 days
       *     expires: 13,
       *
       *     // restrict to given domain
       *     domain: 'foo.example.com',
       *
       *     // restrict to given path
       *     path: '/some/path',
       *
       *     // secure cookie only
       *     secure: true
       *   });
       *
       */
      set: function(key, val /*, opt */) {
        var opt = (arguments.length > 2) ? arguments[2] : {}, 
            now = get_now(),
            expire_at,
            cfg = {};

        // if expires is set, convert it from days to milliseconds
        if (opt.expires) {
          if(opt.expires == -1) {
            cfg.expires = -1
          }
          else {
            // Needed to assign to a temporary variable because of pass by reference issues
            var expires = opt.expires * RATIO;

            // set cookie expiration date
            cfg.expires = new Date(now.getTime() + expires);
            cfg.expires = cfg.expires.toGMTString();
          }
        }

        // set remaining keys
        var keys = ['path', 'domain', 'secure'];
        for (var i = 0; i < keys.length; i++){
          if (opt[keys[i]]){
              cfg[keys[i]] = opt[keys[i]];
          }
        }

        var r = cookify(key, val, cfg);
        doc.cookie = r;

        return val;
      },

      /*
       * Check to see if the given cookie exists.
       *
       * Example:
       *
       *   val = EasyCookie.get('test_cookie');
       *
       */
      has: function(key) {
        key = esc(key);

        var c = doc.cookie,
            ofs = c.indexOf(key + '='),
            len = ofs + key.length + 1,
            sub = c.substring(0, key.length);

        // check to see if key exists
        return ((!ofs && key != sub) || ofs < 0) ? false : true;
      },

      /*
       * Get a cookie value.
       *
       * Example:
       *
       *   val = EasyCookie.get('test_cookie');
       *
       */
      get: function(key) {
        key = esc(key);

        var c = doc.cookie, 
            ofs = c.indexOf(key + '='),
            len = ofs + key.length + 1,
            sub = c.substring(0, key.length),
            end;

        // check to see if key exists
        if ((!ofs && key != sub) || ofs < 0) {
            return null;
        }

        // grab end of value
        end = c.indexOf(';', len);
        if (end < 0) {
            end = c.length;
        }

        // return unescaped value
        return un(c.substring(len, end));
      },

      /*
       * Remove a preset cookie.  If the cookie is already set, then
       * return the value of the cookie.
       *
       * Example:
       *
       *   old_val = EasyCookie.remove('test_cookie');
       *
       */
      remove: function(k) {
        var r = me.get(k), 
            opt = { expires: EPOCH };

        // delete cookie
        doc.cookie = cookify(k, '', opt);

        // return value
        return r;
      },

      /*
       * Get a list of cookie names.
       *
       * Example:
       *
       *   // get all cookie names
       *   cookie_keys = EasyCookie.keys();
       *
       */
      keys: function() {
        var c = doc.cookie, 
            ps = c.split('; '),
            i, p, r = [];

        // iterate over each key=val pair and grab the key
        for (var idx = 0; idx < ps.length; idx++) {
          p = ps[idx].split('=');
          r.push(un(p[0]));
        }

        // return results
        return r;
      },

      /*
       * Get an array of all cookie key/value pairs.
       *
       * Example:
       *
       *   // get all cookies
       *   all_cookies = EasyCookie.all();
       *
       */
      all: function() {
        var c = doc.cookie, 
            ps = c.split('; '),
            i, p, r = [];

        // iterate over each key=val pair and grab the key
        for (var idx = 0; idx < ps.length; idx++) {
          p = ps[idx].split('=');
          r.push([un(p[0]), un(p[1])]);
        }

        // return results
        return r;
      },

      /* 
       * Version of EasyCookie
       */
      version: '0.2.1',

      /*
       * Are cookies enabled?
       *
       * Example:
       *
       *   have_cookies = EasyCookie.enabled
       *
       */
      enabled: false
    };

    // set enabled attribute
    me.enabled = alive.call(me);

    // return self
    return me;
  }());
  
  // wrapper for Array.prototype.indexOf, since IE doesn't have it
  var index_of = (function() {
    if (Array.prototype.indexOf){
      return function(ary, val) { 
        return Array.prototype.indexOf.call(ary, val);
      };
    } else {
      return function(ary, val) {
        var i, l;

        for (var idx = 0, len = ary.length; idx < len; idx++){
          if (ary[idx] == val){
              return idx;
          }
        }

        return -1;
      };
    }
  })();


  // empty function
  empty = function() { };

  /**
   * Escape spaces and underscores in name.  Used to generate a "safe"
   * key from a name.
   *
   * @private
   */
  esc = function(str) {
    return 'PS' + str.replace(/_/g, '__').replace(/ /g, '_s');
  };

  var C = {
    /* 
     * Backend search order.
     * 
     * Note that the search order is significant; the backends are
     * listed in order of capacity, and many browsers
     * support multiple backends, so changing the search order could
     * result in a browser choosing a less capable backend.
     */     
    search_order: [
      // TODO: air
      'localstorage',
      'globalstorage', 
      'gears',
      'cookie',
      'ie',
      'flash'
    ],

    // valid name regular expression
    name_re: /^[a-z][a-z0-9_ \-]+$/i,

    // list of backend methods
    methods: [
      'init', 
      'get', 
      'set', 
      'remove', 
      'load', 
      'save',
      'iterate'
      // TODO: clear method?
    ],

    // sql for db backends (gears and db)
    sql: {
      version:  '1', // db schema version

      // XXX: the "IF NOT EXISTS" is a sqlite-ism; fortunately all the 
      // known DB implementations (safari and gears) use sqlite
      create:   "CREATE TABLE IF NOT EXISTS persist_data (k TEXT UNIQUE NOT NULL PRIMARY KEY, v TEXT NOT NULL)",
      get:      "SELECT v FROM persist_data WHERE k = ?",
      set:      "INSERT INTO persist_data(k, v) VALUES (?, ?)",
      remove:   "DELETE FROM persist_data WHERE k = ?",
      keys:     "SELECT * FROM persist_data"
    },

    // default flash configuration
    flash: {
      // ID of wrapper element
      div_id:   '_persist_flash_wrap',

      // id of flash object/embed
      id:       '_persist_flash',

      // default path to flash object
      path: 'persist.swf',
      size: { w:1, h:1 },

      // arguments passed to flash object
      params: {
        autostart: true
      }
    } 
  };

  // built-in backends
  B = {
    // gears db backend
    // (src: http://code.google.com/apis/gears/api_database.html)
    gears: {
      // no known limit
      size:   -1,

      test: function() {
        // test for gears
        return (window.google && window.google.gears) ? true : false;
      },

      methods: {

        init: function() {
          var db;

          // create database handle (TODO: add schema version?)
          db = this.db = google.gears.factory.create('beta.database');

          // open database
          // from gears ref:
          //
          // Currently the name, if supplied and of length greater than
          // zero, must consist only of visible ASCII characters
          // excluding the following characters:
          //
          //   / \ : * ? " < > | ; ,
          //
          // (this constraint is enforced in the Store constructor)
          db.open(esc(this.name));

          // create table
          db.execute(C.sql.create).close();
        },

        get: function(key) {
          var r, sql = C.sql.get;
          var db = this.db;
          var ret;

          // begin transaction
          db.execute('BEGIN').close();

          // exec query
          r = db.execute(sql, [key]);

          // check result and get value
          ret = r.isValidRow() ? r.field(0) : null;

          // close result set
          r.close();

          // commit changes
          db.execute('COMMIT').close();
          return ret;
        },

        set: function(key, val ) {
          var rm_sql = C.sql.remove,
              sql    = C.sql.set, r;
          var db = this.db;
          var ret;

          // begin transaction
          db.execute('BEGIN').close();

          // exec remove query
          db.execute(rm_sql, [key]).close();

          // exec set query
          db.execute(sql, [key, val]).close();

          // commit changes
          db.execute('COMMIT').close();

          return val;
        },

        remove: function(key) {
          var get_sql = C.sql.get,
              sql = C.sql.remove,
              r, val = null, is_valid = false;
          var db = this.db;

          // begin transaction
          db.execute('BEGIN').close();

          // exec remove query
          db.execute(sql, [key]).close();

          // commit changes
          db.execute('COMMIT').close();

          return true;
        },
        iterate: function(fn,scope) {
          var key_sql = C.sql.keys;
          var r;
          var db = this.db;

          // exec keys query
          r = db.execute(key_sql);
          while (r.isValidRow()) {
            fn.call(scope || this, r.field(0), r.field(1));
            r.next();
          }
          r.close();
        }
      }
    }, 

    // globalstorage backend (globalStorage, FF2+, IE8+)
    // (src: http://developer.mozilla.org/en/docs/DOM:Storage#globalStorage)
    // https://developer.mozilla.org/En/DOM/Storage
    //
    // TODO: test to see if IE8 uses object literal semantics or
    // getItem/setItem/removeItem semantics
    globalstorage: {
      // (5 meg limit, src: http://ejohn.org/blog/dom-storage-answers/)
      size: 5 * 1024 * 1024,

      test: function() {
          if (window.globalStorage) {
              var domain = '127.0.0.1';
              if (this.o && this.o.domain) {
                  domain = this.o.domain;
              }
              try{
                  var dontcare = globalStorage[domain];
                  return true;
              } catch(e) {
                  if (window.console && window.console.warn) {
                      console.warn("globalStorage exists, but couldn't use it because your browser is running on domain:", domain);
                  }
                  return false;
              }
          } else {
              return false;
          }
      },

      methods: {
        key: function(key) {
          return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = globalStorage[this.o.domain];
        },

        get: function(key) {
          // expand key
          key = this.key(key);

          return  this.store.getItem(key);
        },

        set: function(key, val ) {
          // expand key
          key = this.key(key);

          // set value
          this.store.setItem(key, val);

          return val;
        },

        remove: function(key) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store.getItem[key];

          // delete value
          this.store.removeItem(key);

          return val;
        } 
      }
    }, 
    
    // localstorage backend (globalStorage, FF2+, IE8+)
    // (src: http://www.whatwg.org/specs/web-apps/current-work/#the-localstorage)
    // also http://msdn.microsoft.com/en-us/library/cc197062(VS.85).aspx#_global
    localstorage: {
      // (unknown?)
      // ie has the remainingSpace property, see:
      // http://msdn.microsoft.com/en-us/library/cc197016(VS.85).aspx
      size: -1,

      test: function() {
        // FF: Throws a security error when cookies are disabled
        try {
          // Chrome: window.localStorage is available, but calling set throws a quota exceeded error
          if (window.localStorage && 
              window.localStorage.setItem("test", null) == undefined) {
                  if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
                      var ffVersion = RegExp.$1;

                      if (ffVersion >= 9) {
                          return true;
                      }

                      // FF: Fix for Firefox bug when protocol is file: https://bugzilla.mozilla.org/show_bug.cgi?id=507361
                      if (window.location.protocol == 'file:') {
                          return false;
                      }
                  } else {
                    return true;
                  }
          } else {
            return false;
          }
          return window.localStorage ? true : false;
        } catch (e) {
          return false;
        }
      },

      methods: {
        key: function(key) {
          return this.name + '>' + key ;
          //return esc(this.name) + esc(key);
        },

        init: function() {
          this.store = localStorage;
        },

        get: function(key) {
          // expand key
          key = this.key(key);

          return this.store.getItem(key);
        },

        set: function(key, val ) {
          // expand key
          key = this.key(key);

          // set value
          this.store.setItem(key, val);

          return val;
        },

        remove: function(key) {
          var val;

          // expand key
          key = this.key(key);

          // get value
          val = this.store.getItem(key);

          // delete value
          this.store.removeItem(key);

          return val;
        },

        iterate: function(fn, scope) {
          var l = this.store, key, keys;
          for (var i=0;i<l.length;i++) {
            key = l.key(i);
            keys = key.split('>');
            if ((keys.length == 2) && (keys[0] == this.name)) {
              fn.call(scope || this,keys[1], l.getItem(key));
            }
          }
        }
      }
    }, 
    
    // IE backend
    ie: {
      prefix:   '_persist_data-',
      // style:    'display:none; behavior:url(#default#userdata);',

      // 64k limit
      size:     64 * 1024,

      test: function() {
        // make sure we're dealing with IE
        // (src: http://javariet.dk/shared/browser_dom.htm)
        return window.ActiveXObject ? true : false;
      },

      make_userdata: function(id) {
        var el = document.createElement('div');

        // set element properties
        // http://msdn.microsoft.com/en-us/library/ms531424(VS.85).aspx 
        // http://www.webreference.com/js/column24/userdata.html
        el.id = id;
        el.style.display = 'none';
        el.addBehavior('#default#userdata');

        // append element to body
        document.body.appendChild(el);

        // return element
        return el;
      },

      methods: {
        init: function() {
          var id = B.ie.prefix + esc(this.name);

          // save element
          this.el = B.ie.make_userdata(id);

          // load data
          if (this.o.defer){
              this.load();
          }
        },

        get: function(key) {
          var val;

          // expand key
          key = esc(key);

          // load data
          if (!this.o.defer){
              this.load();
          }

          // get value
          val = this.el.getAttribute(key);

          return val;
        },

        set: function(key, val) {
          // expand key
          key = esc(key);
          
          // set attribute
          this.el.setAttribute(key, val);

          // save data
          if (!this.o.defer){
              this.save();
          }

          return val;
        },

        remove: function(key) {
          var val;

          // expand key
          key = esc(key);

          // load data
          if (!this.o.defer){
              this.load();
          }

          // get old value and remove attribute
          val = this.el.getAttribute(key);
          this.el.removeAttribute(key);

          // save data
          if (!this.o.defer){
              this.save();
          }

          return val;
        },

        load: function() {
          this.el.load(esc(this.name));
        },

        save: function() {
          this.el.save(esc(this.name));
        }
      }
    },

    // cookie backend
    // uses easycookie: http://pablotron.org/software/easy_cookie/
    cookie: {
      delim: ':',

      // 4k limit (low-ball this limit to handle browser weirdness, and 
      // so we don't hose session cookies)
      size: 4000,

      test: function() {
        // XXX: use easycookie to test if cookies are enabled
        return P.Cookie.enabled ? true : false;
      },

      methods: {
        key: function(key) {
          return this.name + B.cookie.delim + key;
        },

        get: function(key, fn ) {
          var val;
          
          // expand key 
          key = this.key(key);

          // get value
          val = ec.get(key);

          return val;
        },

        set: function(key, val, fn ) {
          // expand key 
          key = this.key(key);

          // save value
          ec.set(key, val, this.o);

          return val;
        },

        remove: function(key, val ) {
          var val;

          // expand key 
          key = this.key(key);

          // remove cookie
          val = ec.remove(key);

          return val;
        } 
      }
    },

    // flash backend (requires flash 8 or newer)
    // http://kb.adobe.com/selfservice/viewContent.do?externalId=tn_16194&sliceId=1
    // http://livedocs.adobe.com/flash/8/main/wwhelp/wwhimpl/common/html/wwhelp.htm?context=LiveDocs_Parts&file=00002200.html
    flash: {
      test: function() {
        // TODO: better flash detection
        try {
          if (!swfobject){
              return false;
          }
        } catch (e) {
          return false;
        }

        // get the major version
        var major = swfobject.getFlashPlayerVersion().major;

        // check flash version (require 8.0 or newer)
        return (major >= 8) ? true : false;
      },

      methods: {
        init: function() {
          if (!B.flash.el) {
            var key, el, fel, cfg = C.flash;

            // create wrapper element
            el = document.createElement('div');
            el.id = cfg.div_id;

            // create flash element
            fel = document.createElement('div');
            fel.id = cfg.id;

            el.appendChild(fel);

            // append element to body
            document.body.appendChild(el);

            // create new swf object
            B.flash.el = swfobject.createSWF({ id: cfg.id, data: this.o.swf_path || cfg.path, width: cfg.size.w, height: cfg.size.h }, cfg.params, cfg.id);
          }
          
          this.el = B.flash.el;
        },

        get: function(key) {
          var val;

          // escape key
          key = esc(key);

          // get value
          val = this.el.get(this.name, key);

          return val;
        },

        set: function(key, val ) {
          var old_val;

          // escape key
          key = esc(key);

          // set value
          old_val = this.el.set(this.name, key, val);

          return old_val;
        },

        remove: function(key) {
          var val;

          // get key
          key = esc(key);

          // remove old value
          val = this.el.remove(this.name, key);
          return val;
        }
      }
    }
  };

  /**
   * Test for available backends and pick the best one.
   * @private
   */
  init = function() {
    var i, l, b, key, fns = C.methods, keys = C.search_order;

    // set all functions to the empty function
    for (var idx = 0, len = fns.length; idx < len; idx++) {
        P.Store.prototype[fns[idx]] = empty;
    }

    // clear type and size
    P.type = null;
    P.size = -1;

    // loop over all backends and test for each one
    for (var idx2 = 0, len2 = keys.length; !P.type && idx2 < len2; idx2++) {
      b = B[keys[idx2]];

      // test for backend
      if (b.test()) {
        // found backend, save type and size
        P.type = keys[idx2];
        P.size = b.size;
        // extend store prototype with backend methods
        for (key in b.methods) {
            P.Store.prototype[key] = b.methods[key];
        }
      }
    }

    // mark library as initialized
    P._init = true;
  };

  // create top-level namespace
  P = {
    // version of persist library
    VERSION: VERSION,

    // backend type and size limit
    type: null,
    size: 0,

    // XXX: expose init function?
    // init: init,

    add: function(o) {
      // add to backend hash
      B[o.id] = o;

      // add backend to front of search order
      C.search_order = [o.id].concat(C.search_order);

      // re-initialize library
      init();
    },

    remove: function(id) {
      var ofs = index_of(C.search_order, id);
      if (ofs < 0){
          return;
      }

      // remove from search order
      C.search_order.splice(ofs, 1);

      // delete from lut
      delete B[id];

      // re-initialize library
      init();
    },

    // expose easycookie API
    Cookie: ec,

    // store API
    Store: function(name, o) {
      // verify name
      if (!C.name_re.exec(name)){
          throw new Error("Invalid name");
      }

      // XXX: should we lazy-load type?
      // if (!P._init)
      //   init();

      if (!P.type){
          throw new Error("No suitable storage found");
      }

      o = o || {};
      this.name = name;

      // get domain (XXX: does this localdomain fix work?)      
      o.domain = o.domain || location.hostname || 'localhost';
      
      // strip port from domain (XXX: will this break ipv6?)
      o.domain = o.domain.replace(/:\d+$/, '');
      
      // Specifically for IE6 and localhost
      o.domain = (o.domain == 'localhost') ? '' : o.domain;

      // append localdomain to domains w/o '."
      // (see https://bugzilla.mozilla.org/show_bug.cgi?id=357323)
      // (file://localhost/ works, see: 
      // https://bugzilla.mozilla.org/show_bug.cgi?id=469192)
/* 
 *       if (!o.domain.match(/\./))
 *         o.domain += '.localdomain';
 */ 

      this.o = o;

      // expires in 2 years
      o.expires = o.expires || 365 * 2;

      // set path to root
      o.path = o.path || '/';
      
      if (this.o.search_order) {
        C.search_order = this.o.search_order;
        init();
      }

      // call init function
      this.init();
    } 
  };

  // init persist
  init();

  // return top-level namespace
  return P;
})();