/*
 * @license
 * Your First PWA Codelab (https://g.co/codelabs/pwa)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';

// CODELAB: Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v' + Math.random() * 1000;
const DATA_CACHE_NAME = 'data-cache-v2';

// CODELAB: Add list of files to cache here.
const FILES_TO_CACHE = [
    '/',
    '/Scripts/respond.js',
    '/Scripts/modernizr-2.6.2.js',
    '/Scripts/jquery-1.10.2.js',
    '/Scripts/bootstrap.js',
    '/Scripts/jquery-1.10.2.min.js',
    '/Scripts/jquery.signalR-2.2.1.min.js',
    '/Scripts/knockout-3.4.2.js',
    '/Scripts/MyChat.js',
    '/Scripts/MyScript.js',
    '/Scripts/toastr.min.js',
    '/Scripts/jquery.validate.unobtrusive.js',
    '/Content/fonts/glyphicons-halflings-regular.ttf',
    '/Content/toastr.min.css',
    '/Content/icons/avatar1.png',
    '/Content/icons/photo1.png',
    '/Content/bootstrap.css',
    '/Content/site.css',
    '/Content/icons/smile1.png',
    '/Content/emojis/emoji1.png',
    '/Content/emojis/emoji2.png',
    '/Content/emojis/emoji3.png',
    '/Content/emojis/emoji4.png',
    '/Content/emojis/emoji5.png',
    '/Content/emojis/emoji6.png',
    '/Content/emojis/emoji7.png',
    '/Content/fonts/glyphicons-halflings-regular.woff',
    '/Content/icons/image_icon_192.png',
    '/signalr/hubs',
    '/favicon.ico',
    '/manifest.json'
];

self.addEventListener('install', (evt) => {
    console.log('[ServiceWorker] Install');
    // CODELAB: Precache static resources here.
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching offline page');
            for (var i = 0; i < FILES_TO_CACHE.length; i++) {
                console.log('[ServiceWorker] Adding to cache ' + FILES_TO_CACHE[i]);
            }
            return cache.addAll(FILES_TO_CACHE).then(o => console.log('[ServiceWorker] All files added to cache'))
                .catch(err => console.log('[ServiceWorker] Failed to add files. Error: ' + err));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
    console.log('[ServiceWorker] Activate');
    // CODELAB: Remove previous cached data from disk.
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (true/*key !== CACHE_NAME && key !== DATA_CACHE_NAME*/) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
    if (evt.request.url.includes('/signalr/')) {
        console.log('[Service Worker] Fetch (data)', evt.request.url);
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return fetch(evt.request)
                    .then((response) => {
                        // If the response was good, clone it and store it in the cache.
                        if (response.status === 200) {
                            cache.put(evt.request.url, response.clone());
                        }
                        return response;
                    }).catch((err) => {
                        // Network request failed, try to get it from the cache.
                        return cache.match(evt.request);
                    });
            }));
        return;
    }
    evt.respondWith(
        caches.open(CACHE_NAME)
            .then((cache) => {
            return cache.match(evt.request)
                .then((response) => {
                    console.log('[ServiceWorker] Returning ' + evt.request.url + ' from cache...');
                    console.log('[ServiceWorker] Returning ' + response);
                    if (!response) {
                        console.log('[ServiceWorker] Caching ' + evt.request.url);
                        cache.add(evt.request);
                    }
                    return response || fetch(evt.request);
                });
            })
            .catch(() => {
                console.log('[ServiceWorker] Feiled to retrieve from cache ' + evt.request.url)
                return caches.open(CACHE_NAME)
                    .then((cache) => {
                        return cache.match(evt.request);
                    });
            })
    );
});