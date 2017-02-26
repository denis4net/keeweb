'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('cordova', 'Build cordova application', function () {
        const done = this.async();

        grunt.util.spawn({
            cmd: 'cordova',
            args: [this.target].concat(this.args),
            opts: {
                env: process.env,
                shell: true,
                stdout: 'inherit',
                stderr: 'inherit',
                cwd: this.options().cwd || 'cordova'
            }
        }, (error, result, code) => {
            return (error || code) ? grunt.warn(error, code) : done();
        });
    });
};
