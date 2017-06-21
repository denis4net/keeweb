const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const STORE_KEY = 'firebase-db-credentials';

// https://cryptosense.com/parameter-choice-for-pbkdf2/
// https://blog.lastpass.com/2015/06/lastpass-security-notice.html
// https://pages.nist.gov/800-63-3/sp800-63b.html#sec5
const PBKDF2_OPTIONS = {
    keyBytes: 256,
    hashAlgorithm: 'SHA-512',
    iterationsCount: 100000
};

const StorageBase = require('./storage-base');
const firebase = require('firebase');
const Base64 = require('../util/base64');
const Base58 = require('base-x')(BASE58);
const SettingsStore = require('../comp/settings-store');
const TextEncoder = require('text-encoding').TextEncoder;

require('webcrypto-shim');

const FirebaseDB = StorageBase.extend({
    name: 'firebaseDatabase',
    icon: 'hdd-o',
    enabled: true,
    system: false,

    init: function () {
        StorageBase.prototype.init.apply(this, arguments);
        this._ctx = SettingsStore.load(STORE_KEY);
        this._initFirebase();
    },

    needShowOpenConfig: function () {
        return !this._ctx;
    },

    getOpenConfig: function () {
        return {
            fields: [
                { id: 'user', title: 'openUser', placeholder: 'openUserPlaceholder', type: 'text' },
                { id: 'password', title: 'openPass', placeholder: 'openPassPlaceholder', type: 'password' },
                { id: 'userID', title: 'openUserID', placeholder: 'openUserIDPlaceholder', type: 'password' },
                { id: 'signUp', title: 'openSignUp', placeholder: 'openSignUpPlacehodler', type: 'checkbox' }
            ]
        };
    },

    getPathForName: function (fileName) {
        return fileName;
    },

    _initFirebase: function (callback) {
        const config = require('../../../storage-configs/firebase');
        firebase.initializeApp(config);
    },

    _getDBRef: function (path) {
        const key = '/users/' + this._ctx.userId + (path || '');
        this.logger.debug('Accessing:', key);
        return firebase.database().ref(key);
    },

    _getFileRef: function (name) {
        return this._getDBRef('/files/' + (name || ''));
    },

    _getFileStatRef: function (name) {
        return this._getDBRef('/files/' + name + '/stat');
    },

    _generateUserToken: function (config) {
        return crypto.subtle.importKey(
            'raw', // only "raw" is allowed
            (new TextEncoder()).encode(config.password), // your password
            { name: 'PBKDF2' },
            false, // whether the key is extractable (i.e. can be used in exportKey)
            ['deriveBits'] // can be any combination of "deriveKey" and "deriveBits"
        ).then((key) => {
            return window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: (new TextEncoder()).encode(config.user),
                    iterations: PBKDF2_OPTIONS.iterationsCount,
                    hash: { name: PBKDF2_OPTIONS.hashAlgorithm }
                },
                key,
                PBKDF2_OPTIONS.keyBytes * 8
            );
        }).then((bits) => Base58.encode(new Uint8Array(bits)));
    },

    _login: function(userId) {
        this._ctx = { userId: userId };
        SettingsStore.save(STORE_KEY, this._ctx);
        return this._getDBRef().once('value').then((s) => {
            const err = s.exists() ? null : 'User or password is incorrect or user doesn\'t exist';
            return err;
        });
    },

    _signUp: function (config) {
        return this._generateUserToken(config).then(userId => {
            this._ctx = { userId: userId };

            return this._getDBRef().once('value').then((s) => {
                if (s.exists()) {
                    this._ctx = null;
                    return;
                }

                SettingsStore.save(STORE_KEY, this._ctx);
                return this._getDBRef().set({ registrationTime: Date.now() });
            });
        });
    },

    save: function (id, opts, data, callback) {
        crypto.subtle.digest('SHA-256', data).then((hash) => {
            const stat = { rev: Base64.encode(hash) };
            this.logger.debug('Saving', id, stat);
            this._getFileRef(id).update({ data: Base64.encode(data), stat: stat });
            return stat;
        }).then(stat => callback(null, stat)).catch(callback);
    },

    load: function (id, opts, callback) {
        this.logger.debug('Load', id);
        this._getFileRef(id).once('value')
            .then((snapshot) => {
                callback(null, Base64.decode(snapshot.child('data').val()), snapshot.child('stat').val());
            }).catch(callback);
    },

    stat: function (id, opts, callback) {
        this._getFileStatRef(id).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    callback(null, snapshot.val());
                } else {
                    callback({ notFound: true, message: id + ' is not found' });
                }
            })
            .catch(callback);
    },

    list: function (callback) {
        this._getFileRef().once('value')
            .then((snapshot) => {
                const files = [];
                if (snapshot.exists()) {
                    const sFiles = snapshot.val();
                    Object.keys(sFiles).forEach((key) => {
                        files.push({ name: key, rev: sFiles[key].stat.rev, path: key });
                    });
                }
                callback(null, files, '/');
            })
            .catch(callback);
    },

    remove: function (id, opts, callback) {
        this._getFileRef(id).remove().then(callback).catch(callback);
    },

    applyConfig: function (config, callback) {
        if (config.signUp) {
            return this._signUp(config).then(callback).catch(callback);
        } else if (config.userID && config.userID.length > 0) {
            return this._login(config.userID)
                .then(callback)
                .catch(callback);
        } else {
            return this._generateUserToken(config).then(userID => this._login(userID))
                .then(callback)
                .catch(callback);
        }
    }
});

module.exports = new FirebaseDB();
