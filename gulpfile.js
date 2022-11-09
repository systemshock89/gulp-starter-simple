import pkg from 'gulp';
const {src, dest, parallel, series, watch} = pkg;
import browserSync from 'browser-sync';
import webpackStream from 'webpack-stream';
import webpack from 'webpack';
import imagemin from 'gulp-imagemin';
import changed from 'gulp-changed';
import include from 'gulp-file-include';
import gulpSass from 'gulp-sass';
import dartSass from 'sass';
const sass = gulpSass(dartSass);
import postCss from 'gulp-postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import {deleteAsync} from 'del';

const dist = "./dist";

function styles() {
    return src("./src/scss/**/*.scss")
        .pipe(sass().on('error', sass.logError))
        .pipe(dest(dist + '/css'))
        .pipe(browserSync.stream());
}

function stylesProd() {
    return src("./src/scss/**/*.scss")
        .pipe(sass().on('error', sass.logError))
        .pipe(postCss([
            autoprefixer({ grid: 'autoplace' }),
            cssnano({ preset: ['default', { discardComments: { removeAll: true } }] })
        ]))
        .pipe(dest(dist + '/css'));
}

function scripts() {
    return src("./src/js/bundle.js")
        .pipe(webpackStream({
            mode: 'development',
            output: {
                filename: 'bundle.min.js'
            },
            watch: false,
            devtool: "source-map",
            module: {
                // правила для babel
                rules: [
                    {
                        test: /\.m?js$/, // находим файлы js
                        exclude: /(node_modules|bower_components)/, // исключаем папки
                        use: {
                            loader: 'babel-loader', // свяжет webpack и babel
                            options: {
                                presets: [['@babel/preset-env', {
                                    debug: true, // показывает инф-ю во время компиляции
                                    corejs: 3, // биб-ка corejs 3-й версии (для полифилов)
                                    useBuiltIns: "usage" // позволяет corejs выбрать только те полифилы, кот-е нужны в проекте
                                }]]
                            }
                        }
                    }
                ]
            }
        }, webpack)).on('error', (err) => {
            this.emit('end')
        })
        .pipe(dest(dist + '/js'))
        .pipe(browserSync.stream());
}

function scriptsProd() {
    return src("./src/js/bundle.js")
        .pipe(webpackStream({
            mode: 'production',
            output: {
                filename: 'bundle.min.js'
            },
            module: {
                rules: [
                    {
                        test: /\.m?js$/,
                        exclude: /(node_modules|bower_components)/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [['@babel/preset-env', {
                                    debug: false,
                                    corejs: 3,
                                    useBuiltIns: "usage"
                                }]]
                            }
                        }
                    }
                ]
            }
        }, webpack)).on('error', (err) => {
            this.emit('end')
        })
        .pipe(dest(dist + '/js'));
}

function images() {
    // копируем все из img без сжатия, КРОМЕ папки src
    src(["./src/img/**/*", `!./src/img/{src,src/**/*}`])
        .pipe(changed(dist + "/img"))
        .pipe(dest(dist + "/img"))
        .pipe(browserSync.stream());

    // сжимаем содержимое папки img/src и копируем в img
    return src('./src/img/src/**/*')
        .pipe(changed(dist + "/img"))
        .pipe(imagemin())
        .pipe(dest(dist + "/img"))
        .pipe(browserSync.stream());
}

function html() {
    return src('./src/*.html')
        .pipe(include({
            prefix: '@@',
            basepath: './src/parts/',
            indent: true
        }))
        .pipe(dest(dist))
        .pipe(browserSync.stream());
}

function copyAssets() {
    return src("./src/fonts/**/*")
        .pipe(changed(dist + "/fonts"))
        .pipe(dest(dist + "/fonts"))
        .pipe(browserSync.stream());
}

async function clearDistTask() {
    await deleteAsync(dist, { force: true })
}

function watcher() {
    browserSync.init({
        server: dist,
        ghostMode: { clicks: false },
        notify: false,
        online: true,
        // tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt
    });

    watch(["./src/*.html", "./src/parts/*.html"], html);
    watch(["./src/fonts/**/*"], copyAssets);
    watch('./src/img/**/*', images);
    watch("./src/scss/**/*", styles);
    watch("./src/js/**/*", scripts);
}

export let build = parallel(html, styles, scripts, copyAssets, images);
export let clearDist = clearDistTask;
export let prod = series(clearDist, parallel(html, stylesProd, scriptsProd, copyAssets, images));
export default parallel(watcher, build);