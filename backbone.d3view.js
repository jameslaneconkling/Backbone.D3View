// Backbone.D3View.js 0.2.0
// ---------------

//     (c) 2015 Adam Krebs
//     Backbone.D3View may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/akre54/Backbone.D3View

(function (factory) {
  if (typeof define === 'function' && define.amd) { define(['backbone', 'd3'], factory);
  } else if (typeof exports === 'object') { module.exports = factory(require('backbone'), require('d3'));
  } else { factory(Backbone, d3); }
}(function (Backbone, d3) {

  // Cached regex to match an opening '<' of an HTML tag, possibly left-padded
  // with whitespace.
  var paddedLt = /^\s*</;

  // Cache array methods for later use.
  var slice = [].slice;

  // Events need a unique id for attaching multiple events of the same type.
  var uniqueId = 0;

  // Store eventsMap for undelegation.
  var _eventsMap = {};

  Backbone.D3ViewMixin = {

    // A reference to the d3 selection backing the view.
    d3el: null,

    namespace: d3.ns.prefix.svg,

    $: function(selector) {
      return this.el.querySelectorAll(selector);
    },

    $$: function(selector) {
      return this.d3el.selectAll(selector);
    },

    _removeElement: function() {
      this.undelegateEvents();
      delete _eventsMap[this.cid];
      this.d3el.remove();
    },

    _createElement: function(tagName) {
      var ns = _.result(this, 'namespace');
      return ns ?
         document.createElementNS(ns, tagName) :
         document.createElement(tagName);
    },

    _setElement: function(element) {
      if (typeof element == 'string') {
        if (paddedLt.test(element)) {
          var el = document.createElement('div');
          el.innerHTML = element;
          this.el = el.firstChild;
        } else {
          this.el = document.querySelector(element);
        }
      } else {
        this.el = element;
      }

      this.d3el = d3.select(this.el);
    },

    _setAttributes: function(attributes) {
      this.d3el.attr(attributes);
    },

    // `delegate` supports two- and three-arg forms. The `selector` is optional.
    delegate: function(eventName, selector, listener) {
      var el;

      if (typeof selector === 'string') {
        el = selector === '' ? this.d3el : this.d3el.selectAll(selector);
      } else {
        el = this.d3el;
        listener = selector;
        selector = null;
      }

      // d3 needs `uniqueId` to delegate more than one listener per event type.
      var namespace = '.' + uniqueId++;

      var map = _eventsMap[this.cid] || (_eventsMap[this.cid] = {}),
          handlers = map[eventName] || (map[eventName] = []);

      handlers.push({selector: selector, listener: listener, namespace: namespace});

      // The `event` object is stored in `d3.event` but Backbone expects it as
      // the first argument to the listener.
      el.on(eventName + namespace, function() {
        var args = slice.call(arguments);
        args.unshift(d3.event);
        listener.apply(this, args);
      });
      return this;
    },

    undelegate: function(eventName, selector, listener) {
      if (typeof selector !== 'string') {
        listener = selector;
        selector = null;
      }

      var map = _eventsMap[this.cid] || (_eventsMap[this.cid] = {}),
          handlers = map[eventName];

      _(handlers).chain()
        .filter(function(handler) {
          return (listener ? handler.listener === listener : true) &&
            (selector ? handler.selector === selector : true);
        })
        .forEach(function(handler) {
          removeEvent(this.d3el, eventName, selector || handler.selector, handler.namespace);
          handlers.splice(_.indexOf(handlers, handler), 1);
        }, this);
    },

    undelegateEvents: function() {
      if (!this.d3el) return;

      var map = _eventsMap[this.cid] || (_eventsMap[this.cid] = {});

      for (var eventName in map) {
        _.each(map[eventName], function(handler) {
          removeEvent(this.d3el, eventName, handler.selector, handler.namespace);
        }, this);
      }

      _eventsMap[this.cid] = {};
      return this;
    }
  };

  // Avoid a costly loop through handlers for `undelegateEvents`.
  var removeEvent = function(d3el, eventName, selector, namespace) {
    var el = selector ? d3el.selectAll(selector) : d3el;
    el.on(eventName + namespace, null);
  }

  Backbone.D3View = Backbone.View.extend(Backbone.D3ViewMixin);

  return Backbone.D3View;
}));
