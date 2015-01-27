/*global describe, it, expect, require, Reflect */

var exported = require('../');

var ifSymbolsIt = typeof Symbol === 'function' ? it : xit;
var ifES5It = Object.defineProperty ? describe : xdescribe;
var ifFreezeIt = typeof Object.freeze === 'function' ? it : xit;

// Reflect requires defineProperty
ifES5It('Reflect', function () {
  var object = {
    something: 1,
    _value: 0
  };

  Object.defineProperties(object, {
    value: {
      get: function () {
        return this._value;
      }
    },

    setter: {
      set: function (val) {
        this._value = val;
      }
    },

    bool: {
      value: true
    }
  });

  var testXThrow = function (values, func) {
    function checker(item) {
      try {
        func(item);
        return false;
      } catch (e) {
        return e instanceof TypeError;
      }
    }

    values.forEach(function (item) {
      expect(item).to.satisfy(checker);
    });
  };

  var testCallableThrow = testXThrow.bind(null, [null, undefined, 1, 'string', true, [], {}]);

  var testPrimitiveThrow = testXThrow.bind(null, [null, undefined, 1, 'string', true]);

  it('is on the exported object', function () {
    expect(exported.Reflect).to.equal(Reflect);
  });

  describe('Reflect.apply()', function () {
    it('is a function', function () {
      expect(typeof Reflect.apply).to.equal('function');
    });

    it('throws if target isn’t callable', function () {
      testCallableThrow(function (item) {
        return Reflect.apply(item, null, []);
      });
    });

    it('works also with redefined apply', function () {
      expect(Reflect.apply(Array.prototype.push, [1, 2], [3, 4, 5])).to.equal(5);

      function F(a, b, c) {
        return a + b + c;
      }

      F.apply = false;

      expect(Reflect.apply(F, null, [1, 2, 3])).to.equal(6);

      function G(last) {
        return this.x + 'lo' + last;
      }

      G.apply = function nop() {};

      expect(Reflect.apply(G, { x: 'yel' }, ['!'])).to.equal('yello!');
    });
  });

  describe('Reflect.construct()', function () {
    it('is a function', function () {
      expect(typeof Reflect.construct).to.equal('function');
    });

    it('throws if target isn’t callable', function () {
      testCallableThrow(function (item) {
        return Reflect.apply(item, null, []);
      });
    });

    it('works also with redefined apply', function () {
      function C(a, b, c) {
        this.qux = [a, b, c].join('|');
      }

      C.apply = undefined;

      expect(Reflect.construct(C, ['foo', 'bar', 'baz']).qux).to.equal('foo|bar|baz');
    });
  });

  describe('Reflect.defineProperty()', function () {
    it('is a function', function () {
      expect(typeof Reflect.defineProperty).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.defineProperty(item, 'prop', { value: true });
      });
    });

    it('returns false for non-extensible objects', function () {
      var o = Object.preventExtensions({});

      expect(Reflect.defineProperty(o, 'prop', {})).to.equal(false);
    });

    it('can return true, even for non-configurable, non-writable properties', function () {
      var o = {}, desc = {
        value: 13,
        enumerable: false,
        writable: false,
        configurable: false
      };

      expect(Reflect.defineProperty(o, 'prop', desc)).to.equal(true);

      // Defined as non-configurable, but descriptor is identical.
      expect(Reflect.defineProperty(o, 'prop', desc)).to.equal(true);

      desc.value = 37; // Change

      expect(Reflect.defineProperty(o, 'prop', desc)).to.equal(false);
    });

    it('can change from one property type to another, if configurable', function () {
      var o = {};

      var desc1 = {
        set: function () {},
        configurable: true
      };

      var desc2 = {
        value: 13,
        configurable: false
      };

      var desc3 = {
        get: function () {}
      };

      expect(Reflect.defineProperty(o, 'prop', desc1)).to.equal(true);

      expect(Reflect.defineProperty(o, 'prop', desc2)).to.equal(true);

      expect(Reflect.defineProperty(o, 'prop', desc3)).to.equal(false);
    });
  });

  describe('Reflect.deleteProperty()', function () {
    it('is a function', function () {
      expect(typeof Reflect.deleteProperty).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.deleteProperty(item, 'prop');
      });
    });

    it('returns true for success and false for failure', function () {
      var o = { a: 1 };

      Object.defineProperty(o, 'b', { value: 2 });

      expect(o).to.have.property('a');
      expect(o).to.have.property('b');
      expect(o.a).to.equal(1);
      expect(o.b).to.equal(2);

      expect(Reflect.deleteProperty(o, 'a')).to.equal(true);

      expect(o).not.to.have.property('a');
      expect(o.b).to.equal(2);

      expect(Reflect.deleteProperty(o, 'b')).to.equal(false);

      expect(o).to.have.property('b');
      expect(o.b).to.equal(2);

      expect(Reflect.deleteProperty(o, 'a')).to.equal(true);
    });

    it('cannot delete a function’s name property', function () {
      expect(Reflect.deleteProperty(function a() {}, 'name')).to.equal(false);
    });
  });

  describe('Reflect.enumerate()', function () {
    it('is a function', function () {
      expect(typeof Reflect.enumerate).to.equal('function');
    });

    it('only includes enumerable properties', function () {
      var a = Object.create(null, {
        // Non-enumerable per default.
        a: { value: 1 }
      });

      a.b = 2;

      var iter = Reflect.enumerate(a);

      /*jshint notypeof: true */
      if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
        expect(Symbol.iterator in iter).to.equal(true);
      }

      expect(Array.from(iter)).to.deep.equal(['b']);
    });

    it('includes all enumerable properties of prototypes', function () {
      var a = { prop: true };
      var b = Object.create(a);

      expect(Array.from(Reflect.enumerate(b))).to.deep.equal(['prop']);
    });

    it('yields keys determined at first next() call', function () {
      var obj = { a: 1, b: 2 },
      iter = Reflect.enumerate(obj);

      expect(iter.next()).to.deep.equal({ value: 'a', done: false });

      obj.c = 3;
      expect(iter.next()).to.deep.equal({ value: 'b', done: false });
      expect(iter.next()).to.deep.equal({ value: undefined, done: true });

      obj = { a: 1, b: 2 };
      iter = Reflect.enumerate(obj);

      obj.c = 3;
      expect(iter.next()).to.deep.equal({ value: 'a', done: false });
      expect(iter.next()).to.deep.equal({ value: 'b', done: false });
      expect(iter.next()).to.deep.equal({ value: 'c', done: false });
      expect(iter.next()).to.deep.equal({ value: undefined, done: true });

      obj = { a: 1, b: 2 };
      iter = Reflect.enumerate(obj);

      expect(iter.next()).to.deep.equal({ value: 'a', done: false });
      delete obj.b;
      expect(iter.next()).to.deep.equal({ value: undefined, done: true });
    });
  });

  describe('Reflect.get()', function () {
    it('is a function', function () {
      expect(typeof Reflect.get).to.equal('function');
    });

    it('throws on null and undefined', function () {
      [null, undefined].forEach(function (item) {
        expect(function () {
          return Reflect.get(item, 'property');
        }).to['throw'](TypeError);
      });
    });

    it('can retrieve a simple value, from the target', function () {
      var p = { something: 2, bool: false };

      expect(Reflect.get(object, 'something')).to.equal(1);
      // p has no effect
      expect(Reflect.get(object, 'something', p)).to.equal(1);

      // Value-defined properties take the target's value,
      // and ignore that of the receiver.
      expect(Reflect.get(object, 'bool', p)).to.equal(true);

      // Undefined values
      expect(Reflect.get(object, 'undefined_property')).to.equal(undefined);
    });

    it('will invoke getters on the receiver rather than target', function () {
      var other = { _value: 1337 };

      expect(Reflect.get(object, 'value', other)).to.equal(1337);

      // No getter for setter property
      expect(Reflect.get(object, 'setter', other)).to.equal(undefined);
    });

    it('will search the prototype chain', function () {
      var other = Object.create(object);
      other._value = 17;

      var yet_another = { _value: 4711 };

      expect(Reflect.get(other, 'value', yet_another)).to.equal(4711);

      expect(Reflect.get(other, 'bool', yet_another)).to.equal(true);
    });
  });

  describe('Reflect.getOwnPropertyDescriptor()', function () {
    it('is a function', function () {
      expect(typeof Reflect.getOwnPropertyDescriptor).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.getOwnPropertyDescriptor(item, 'prop');
      });
    });

    it('retrieves property descriptors', function () {
      var obj = { a: 4711 };

      var desc = Reflect.getOwnPropertyDescriptor(obj, 'a');

      expect(desc).to.deep.equal({
        value: 4711,
        configurable: true,
        writable: true,
        enumerable: true
      });
    });
  });

  describe('Reflect.getPrototypeOf()', function () {
    it('is a function', function () {
      expect(typeof Reflect.getPrototypeOf).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.getPrototypeOf(item);
      });
    });

    it('retrieves prototypes', function () {
      expect(Reflect.getPrototypeOf(Object.create(null))).to.equal(null);

      expect(Reflect.getPrototypeOf([])).to.equal(Array.prototype);
    });
  });

  describe('Reflect.has()', function () {
    it('is a function', function () {
      expect(typeof Reflect.has).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.has(item, 'prop');
      });
    });

    it('will detect own properties', function () {
      var target = Object.create(null);

      expect(Reflect.has(target, 'prop')).to.equal(false);

      target.prop = undefined;
      expect(Reflect.has(target, 'prop')).to.equal(true);

      delete target.prop;
      expect(Reflect.has(target, 'prop')).to.equal(false);

      Object.defineProperty(target, 'accessor', {
        set: function () {}
      });

      expect(Reflect.has(target, 'accessor')).to.equal(true);

      expect(Reflect.has(Reflect.has, 'length')).to.equal(true);
    });

    it('will search the prototype chain', function () {
      var intermediate = Object.create(object),
      target = Object.create(intermediate);

      intermediate.some_property = undefined;

      expect(Reflect.has(target, 'bool')).to.equal(true);
      expect(Reflect.has(target, 'some_property')).to.equal(true);
      expect(Reflect.has(target, 'undefined_property')).to.equal(false);
    });
  });

  describe('Reflect.isExtensible()', function () {
    it('is a function', function () {
      expect(typeof Reflect.isExtensible).to.equal('function');
    });

    it('returns true for plain objects', function () {
      expect(Reflect.isExtensible({})).to.equal(true);
      expect(Reflect.isExtensible(Object.preventExtensions({}))).to.equal(false);
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.isExtensible(item);
      });
    });
  });

  describe('Reflect.ownKeys()', function () {
    it('is a function', function () {
      expect(typeof Reflect.ownKeys).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.ownKeys(item);
      });
    });

    it('should return the same result as Object.getOwnPropertyNames if there are no Symbols', function () {
      var obj = { foo: 1, bar: 2 };

      obj[1] = 'first';

      var result = Object.getOwnPropertyNames(obj);

      // Reflect.ownKeys depends on the implementation of
      // Object.getOwnPropertyNames, at least for non-symbol keys.
      expect(Reflect.ownKeys(obj)).to.deep.equal(result);

      // We can only be sure of which keys should exist.
      expect(result.sort()).to.deep.equal(['1', 'bar', 'foo']);
    });

    ifSymbolsIt('symbols come last', function () {
      var s = Symbol();

      var o = {
        'non-symbol': true
      };

      o[s] = true;

      expect(Reflect.ownKeys(o)).to.deep.equal(['non-symbol', s]);
    });
  });

  describe('Reflect.preventExtensions()', function () {
    it('is a function', function () {
      expect(typeof Reflect.preventExtensions).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.preventExtensions(item);
      });
    });

    it('prevents extensions on objects', function () {
      var obj = {};
      Reflect.preventExtensions(obj);
      expect(Object.isExtensible(obj)).to.equal(false);
    });
  });

  describe('Reflect.set()', function () {
    it('is a function', function () {
      expect(typeof Reflect.set).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.set(item, 'prop', 'value');
      });
    });

    it('sets values on receiver', function () {
      var target = {};
      var receiver = {};

      expect(Reflect.set(target, 'foo', 1, receiver)).to.equal(true);

      expect('foo' in target).to.equal(false);
      expect(receiver.foo).to.equal(1);

      expect(Reflect.defineProperty(receiver, 'bar', {
        value: 0,
        writable: true,
        enumerable: false,
        configurable: true
      })).to.equal(true);

      expect(Reflect.set(target, 'bar', 1, receiver)).to.equal(true);
      expect(receiver.bar).to.equal(1);
      expect(Reflect.getOwnPropertyDescriptor(receiver, 'bar').enumerable).to.equal(false);

      var out;
      target = Object.create({}, {
        o: {
          set: function (v) { out = this; }
        }
      });

      expect(Reflect.set(target, 'o', 17, receiver)).to.equal(true);
      expect(out).to.equal(receiver);
    });
  });

  describe('Reflect.setPrototypeOf()', function () {
    it('is a function', function () {
      expect(typeof Reflect.setPrototypeOf).to.equal('function');
    });

    it('throws if the target isn’t an object', function () {
      testPrimitiveThrow(function (item) {
        return Reflect.setPrototypeOf(item, null);
      });
    });

    it('throws if the prototype is neither object nor null', function () {
      var o = {};

      [undefined, 1, 'string', true].forEach(function (item) {
        expect(function () {
          return Reflect.setPrototypeOf(o, item);
        }).to['throw'](TypeError);
      });
    });

    it('can set prototypes, and returns true on success', function () {
      var obj = {};

      expect(Reflect.setPrototypeOf(obj, Array.prototype)).to.equal(true);
      expect(obj).to.be.an.instanceOf(Array);

      expect(obj.toString).not.to.equal(undefined);
      expect(Reflect.setPrototypeOf(obj, null)).to.equal(true);
      expect(obj.toString).to.equal(undefined);
    });

    ifFreezeIt('is returns false on failure', function () {
      var obj = Object.freeze({});

      expect(Reflect.setPrototypeOf(obj, null)).to.equal(false);
    });

    it('fails when attempting to create a circular prototype chain', function () {
      var o = {};

      expect(Reflect.setPrototypeOf(o, o)).to.equal(false);
    });
  });
});
