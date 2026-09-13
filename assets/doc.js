/* Antidote — behaviour for the legal pages: theme toggle and burger only. */
(function () {
  'use strict';
  var root = document.documentElement;
  var THEME_KEY = 'antidote-theme';
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var saved = recall(THEME_KEY);
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  var themeBtn = document.getElementById('themeBtn');
  function sync() {
    var light = root.getAttribute('data-theme') === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  themeBtn.addEventListener('click', function () {
    var light = root.getAttribute('data-theme') === 'light';
    root.setAttribute('data-theme', light ? 'dark' : 'light');
    store(THEME_KEY, light ? 'dark' : 'light');
    sync();
  });
  sync();
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
