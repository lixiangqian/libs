/* --------------------------------------------- */
/* Author: http://codecanyon.net/user/CodingJack */
/* --------------------------------------------- */

/* jshint smarttabs: true */
/* global jQuick */

;
(function($) {

    var defaults = {

        volume: 75, // number between 0-100
        loop: true, // loop when playlist finishes
        autoplay: true, // autoplay the first song
        randomize: false, // randomize the playlist
        staticIcon: false, // use static icon instead of animated bars, true/false
        animateBars: true, // animate the bars if used, true/false
        numberedTitles: true, // automatically current-song/total-songs prefix to song titles
        showPopupOnHover: true, // show popup bubble on mouse over
        oggAvailable: false, // an ogg version of the song is available for HTML5 Audio playback on browsers that don't support mp3
        fallback: 'swf/music.swf', // location of the Flash swf, relative to the web page where the music player exists

        titleSpeed: 50, // title text ticker speed
        animationDuration: 300 // music bars transition speed

    },

    canTransition,
    players = [],
        canAnimate,
        browser,
        android,
        version,
        mobile,
        html5,
        isIE8,
        isIE,
        mp3,

        /* CSS injected and dynamically updated for smooth title tweens */
        styles = '@-webkit-keyframes cj-rotator {' +

        '0% {' + 'margin-left: 0;' + '}' +

        '100% {' + 'margin-left: (end);' + '}' +

        '}' +

        '@-moz-keyframes cj-rotator {' +

        '0% {' + 'margin-left: 0;' + '}' +

        '100% {' + 'margin-left: (end);' + '}' +

        '}' +

        '@-o-keyframes cj-rotator {' +

        '0% {' + 'margin-left: 0;' + '}' +

        '100% {' + 'margin-left: (end);' + '}' +

        '}' +

        '@keyframes cj-rotator {' +

        '0% {' + 'margin-left: 0;' + '}' +

        '100% {' + 'margin-left: (end);' + '}' +

        '}' +

        '.cj-title-move {' +

        '-webkit-animation: cj-rotator (time)s linear infinite;' + '-moz-animation: cj-rotator (time)s linear infinite;' + '-o-animation: cj-rotator (time)s linear infinite;' + 'animation: cj-rotator (time)s linear infinite;' +

        '}';

    /* plugin hook */
    $.fn('cjMusicBars', function(sets, args) {

        if (!this.length) return;

        // plugin init
        if (!sets || typeof sets === 'object') {

            mobile = $.mobile();
            browser = $.browser();
            android = mobile === 'android' && browser !== 'chrome' && browser !== 'firefox';

            isIE = browser === 'msie';
            if (isIE) {

                version = $.version();
                isIE8 = version < 9;

            }

            return this.each(function(i) {

                players[i] = new MusicPlayer(this, sets, i);

            });

        }
        // api call
        else {

            return this.each(function() {

                $.cjMusicBars($(this), sets, args);

            });

        }

    });

    /* API hook */
    $.cjMusicBars = function($this, method, args) {

        var fromFlash = typeof $this === 'string',
            i = players.length,
            compare,
            player;

        while (i--) {

            player = players[i];
            compare = !fromFlash ? player.player : player.fallbackId;

            if ($this === compare) {

                player[method](args);
                break;

            }

        }

    };

    /* Player Instance */
    function MusicPlayer(ths, sets, id) {

        var $this = $(ths),
            list = [],
            titles = [],
            songTotal, songUrl, songTitle, len;

        /* loop through each song in the playlist */
        $this.find('li').each(function() {

            song = $(this);
            songUrl = song.attr('data-song');

            if (song && songUrl) {

                len = list.length;
                list[len] = songUrl;

                songTitle = song.html();
                if (songTitle) titles[len] = songTitle;

            }

        });

        songTotal = list.length;
        if (!songTotal) return;

        var musicBars = $this.children('.cj-bars'),
            meta = $this.children('.cj-music-meta'),
            audio = document.createElement('audio'),
            settings = $.extend({}, defaults),
            visibleMeta,
            forceFlash,
            randomize,
            barTotal,
            autoplay,
            volume,
            music,
            loop,
            song;

        if (!meta.length) meta = null;
        if (sets) $.extend(settings, sets);
        if (browser === 'firefox') $this.addClass('cj-ff-fix');

        this.isOn = 0;
        this.props = {};
        this.player = $this;
        this.settings = settings;
        this.songTotal = songTotal;
        this.tweenSets = {
            duration: settings.animationDuration,
            ease: 'Linear.easeNone'
        };

        randomize = $this.attr('data-randomize');
        randomize = randomize ? randomize === 'true' : settings.randomize;

        /* randomizes the playlist if chosen */
        if (randomize) {

            var shuf = [],
                shuf2 = [],
                placer, i;

            for (i = 0; i < songTotal; i++) {

                shuf[i] = list[i];
                shuf2[i] = titles[i];

            }

            list = [];
            titles = [];

            while (shuf.length > 0) {

                placer = (Math.random() * shuf.length) | 0;
                len = list.length;

                list[len] = shuf[placer];
                titles[len] = shuf2[placer];

                shuf.splice(placer, 1);
                shuf2.splice(placer, 1);

            }

        }

        this.list = list;
        this.titles = titles;
        this.titleSpeed = settings.titleSpeed;

        /* test for CSS3 animation support */
        if (typeof canAnimate === 'undefined') {

            var el = $('<span class="cj-animation-test" />').appendTo($this);
            canAnimate = el.css('animation-name') || el.css('-webkit-animation-name') || el.css('-moz-animation-name') || el.css('-o-animation-name') || null;

            el.remove();
            canTransition = $.transitions();

            if (isIE8) canTransition = true;
            if (android) canTransition = false;

        }

        /* if music bars exist */
        if (musicBars.length) {

            var bars = [],
                staticIcon = $this.attr('data-static-icon'),
                animateBars = $this.attr('data-animate-bars'),
                singleBars = musicBars.children('.cj-single-bar');

            staticIcon = staticIcon ? staticIcon === 'true' : settings.staticIcon;
            animateBars = animateBars ? animateBars === 'true' : settings.animateBars;

            if (!staticIcon) {

                if (singleBars.length) {

                    singleBars.each(function(i) {

                        bars[i] = $(this);

                    });

                }

            } else {

                singleBars.hide();
                musicBars.children('.cj-static-icon').show();
                if (isIE8) this.staticIcon = true;

            }

            this.musicBars = musicBars.data('playerId', id).on('click', buttonClick);
            barTotal = bars.length;

            if (barTotal) {

                musicBars.addClass('cj-rotate-bars');

                if (!isIE8 && animateBars) {

                    this.bars = bars;
                    this.barTotal = barTotal;
                    this.barLow = parseInt(bars[0].css('height'), 10) || 3;
                    this.barHigh = parseInt(musicBars.css('height'), 10) || 16;

                }

            }

            if (meta) {

                this.meta = meta;
                $this.data('playerId', id);

                var hoverBubble = $this.attr('data-show-popup-on-hover');
                hoverBubble = hoverBubble ? hoverBubble === 'true' : settings.showPopupOnHover;

                if (hoverBubble) {

                    $this.on('mouseover', showMeta).on('mouseout', hideMeta);

                } else {

                    visibleMeta = this.visibleMeta = true;

                }

            }

            musicBars.css('visibility', 'visible');

        } else if (meta) {

            visibleMeta = this.visibleMeta = true;

        }

        $this.addClass('cj-music-position');
        autoplay = $this.attr('data-autoplay');
        autoplay = autoplay ? autoplay === 'true' : settings.autoplay;

        if (mobile) autoplay = false;
        this.autoplay = autoplay;

        /* if player bubble exists */
        if (meta) {

            var title = meta.children('.cj-music-title'),
                nav = meta.children('.cj-music-nav');

            if (!nav.length) nav = null;
            if (!title.length) title = null;

            if (browser !== 'opera') {

                meta.addClass('cj-meta-trans');

            } else {

                canAnimate = canTransition = false;

            }

            /* if song titles exist */
            if (title) {

                if (titles.length) {

                    if (canAnimate) {

                        var sheet = document.createElement('style');
                        document.getElementsByTagName('head')[0].appendChild(sheet);
                        this.sheet = $(sheet);

                    }

                    var numTitles = $this.attr('data-numbered-titles');
                    title.data('playerId', id);

                    this.title = title;
                    this.text = title.find('span').data('playerId', id);

                    this.numTitles = numTitles ? numTitles === 'true' : settings.numberedTitles;
                    this.updateTitle(true);

                } else {

                    title.remove();
                    if (nav) nav.addClass('cj-no-title');

                }

            } else {

                this.titles = [];
                if (nav) nav.addClass('cj-no-title');

            }

            /* if player controls exist */
            if (nav) {

                var playPause = nav.children('.cj-music-playpause'),
                    prevSong = $('.cj-music-prevsong'),
                    nextSong = $('.cj-music-nextsong');

                if (playPause.length) {

                    var playBtn = playPause.children('.cj-music-play'),
                        pauseBtn = playPause.children('.cj-music-pause');

                    if (playBtn.length && pauseBtn.length) {

                        this.playBtn = playBtn;
                        this.pauseBtn = pauseBtn;

                        if (autoplay) {
                            playBtn.hide();
                        } else {
                            pauseBtn.hide();
                        }

                        this.playPause = playPause.data('playerId', id).on('click', buttonClick);

                    }

                }

                if (songTotal > 1) {

                    var pSong = prevSong.length,
                        nSong = nextSong.length;

                    if (pSong) prevSong.data('playerId', id).on('click', buttonClick);
                    if (nSong) nextSong.data('playerId', id).on('click', buttonClick);

                    if (!pSong && !nSong) {

                        playPause.addClass('cj-wide-button');

                    } else if (!this.playPause) {

                        if (pSong) prevSong.addClass('cj-wide-nav');
                        if (nSong) nextSong.addClass('cj-wide-nav');

                    }

                } else {

                    if (prevSong.length) prevSong.remove();
                    if (nextSong.length) nextSong.remove();

                    if (this.playPause) {
                        playPause.addClass('cj-wide-button');
                    } else {
                        nav.remove();
                    }

                }

            }

        }

        loop = $this.attr('data-loop');
        volume = parseInt($this.attr('data-volume'), 10) || settings.volume;

        forceFlash = $this.attr('data-ogg-available');
        forceFlash = forceFlash ? forceFlash === 'true' : settings.oggAvailable;

        if (!volume) volume = 75;
        if (typeof html5 === 'undefined') html5 = audio.canPlayType;

        if (html5) {

            if (typeof mp3 === 'undefined') mp3 = audio.canPlayType('audio/mpeg');
            if (!mobile && !mp3 && forceFlash) html5 = false;

        }

        this.volume = volume = volume * 0.01;
        this.loop = loop ? loop === 'true' : settings.loop;

        /* if HTML5 player is to be used */
        if (html5) {

            this.music = music = audio;
            audio = $(audio).appendTo($this);

            ths.cjId = id;
            ths.cjMusic = music;
            ths.cjVolume = volume;

            music.volume = 0;
            music.playerId = id;
            music.addEventListener('ended', audioEnded, false);

            if (mp3) {

                var source = $('<source />').attr({
                    src: list[0],
                    type: 'audio/mpeg'
                }).prependTo(audio);
                if (isIE) this.source = source;

            } else {

                $('<source />').attr({
                    src: getSong(list[0]),
                    type: 'audio/ogg'
                }).prependTo(audio);

            }

            if (autoplay) this.togglePlayPause();

        }
        /* if Flash fallback is to be used */
        else {

            var fallbackId = this.fallbackId = 'cj-music-bars-' + id,
                fallback = $this.attr('data-fallback') || settings.fallback,

                obj = '<object type="application/x-shockwave-flash" width="1" height="1" id="' + fallbackId + '"';
            if (!isIE) obj += ' data="' + fallback + '"';

            $('<div class="cj-music-object" />').html(obj + '>' +

            '<param name="movie" value="' + fallback + '" />' + '<param name="allowScriptAccess" value="always" />' + '<param name="wmode" value="transparent" />' + '<param name="flashvars" value="' + 'list=' + list.toString() + '&auto=' + autoplay + '&vol=' + volume + '&id=' + fallbackId + '" />' +

            '</object>').appendTo($this);

        }

        if (visibleMeta) {

            $this = this;

            setTimeout(function() {

                meta.addClass('cj-visible-meta');
                $this.moveText();

            }, 250);

        }

    }

    /* Player Functions */
    MusicPlayer.prototype = {

        /* play music */
        play: function() {

            if (!this.isPlaying) this.togglePlayPause();

        },

        /* pause music */
        pause: function() {

            if (this.isPlaying) this.togglePlayPause();

        },

        /* play next song */
        nextSong: function() {

            var isOn = this.isOn;
            this.isOn = isOn < this.songTotal - 1 ? isOn + 1 : 0;
            this.songEnded(true);

        },

        /* play previous song */
        prevSong: function() {

            var isOn = this.isOn;
            this.isOn = isOn > 0 ? isOn - 1 : this.songTotal - 1;
            this.songEnded(true);

        },

        /* API method only, play a particular song index, index starts with the number 0 */
        playSong: function(index) {

            if (index > -1 && index < this.songTotal && index !== this.isOn) {

                this.isOn = index;
                this.songEnded(true);

            }

        },

        /* handles play/pause */
        togglePlayPause: function() {

            if (this.hasLooped) {

                this.songEnded(true);
                return;

            }

            var isPlaying = this.isPlaying;

            if (isPlaying) {

                this.scaleSound();
                this.pauseBars();

                if (this.playPause) {

                    this.pauseBtn.hide();
                    this.playBtn.show();

                }

            } else {

                if (html5) this.music.play();

                this.scaleSound(true);
                this.animateBars();

                if (this.playPause) {

                    this.playBtn.hide();
                    this.pauseBtn.show();

                }

            }

            this.isPlaying = !isPlaying;

        },

        /* start animating music bars */
        animateBars: function() {

            var bars = this.bars;

            if (!this.bars) {

                if (!this.staticIcon && this.musicBars) this.musicBars.addClass('cj-static-bars');
                return;

            }

            animate(this, bars);

        },

        /* stop animating music bars */
        pauseBars: function() {

            var bars = this.bars;

            if (!bars) {

                if (!this.staticIcon && this.musicBars) this.musicBars.removeClass('cj-static-bars');
                return;

            }

            var i = this.barTotal,
                sets = this.tweenSets,
                props = {
                    height: this.barLow
                };

            if (sets.onComplete) delete sets.onComplete;
            while (i--) bars[i].animate(props, sets);

        },

        /* scales volume up and down */
        scaleSound: function(up) {

            if (html5) {

                if (this.songPlayed) {

                    this.player.tick({

                        duration: 1000,
                        ease: 'Linear.easeNone',
                        onUpdate: up ? volumeUp : volumeDown

                    });

                } else {

                    this.music.volume = this.volume;
                    this.songPlayed = true;

                }

            } else {

                try {
                    thisMovie(this.fallbackId).toggleState(up);
                } catch (event) {}

            }

        },

        /* changes song */
        songEnded: function(api) {

            var isOn = this.isOn,
                fromFlash;

            if (typeof api === 'object') {

                fromFlash = api[1];
                api = api[0];

            }

            if (!api) {

                if (!this.loop && isOn === this.songTotal - 1) {

                    this.isPlaying = false;
                    this.hasLooped = true;
                    this.pauseBars();

                    if (this.playPause) {

                        this.pauseBtn.hide();
                        this.playBtn.show();

                    }
                    return;

                } else {

                    isOn = this.isOn = isOn < this.songTotal - 1 ? isOn + 1 : 0;

                }

            }

            if (this.playPause) {

                this.playBtn.hide();
                this.pauseBtn.show();

            }

            this.updateTitle(false, true);

            if (html5) {

                this.player.stop();
                clearTimeout(this.timer);

                var music = this.music;
                music.removeEventListener('ended', audioEnded, false);
                music.pause();
                music.volume = this.volume;

                if (!isIE || version > 9) {
                    music.src = getSong(this.list[isOn]);
                } else {
                    this.source.attr('src', getSong(this.list[isOn]));
                }

                music.load();
                this.timer = setTimeout(function() {

                    music.play();
                    music.addEventListener('ended', audioEnded, false);

                }, !android ? 100 : 500);

            } else if (api || fromFlash) {

                try {
                    thisMovie(this.fallbackId).playSong(isOn);
                } catch (event) {}

            }

            this.hasLooped = false;
            this.isPlaying = true;
            this.animateBars();

        },

        /* updates song title */
        updateTitle: function(firstRun, delay) {

            if (!firstRun) this.stopText();
            var isOn = this.isOn,
                title = this.titles[isOn];

            if (!title) {

                this.hasTitle = false;
                if (this.title) this.title.text('');
                return;

            }

            var container = this.title,
                holder = this.text,
                width;

            if (title.toLowerCase().search('</a>') !== -1) {

                var text = $('<span />').html(title).children('a');

                this.target = text.attr('target') || '_parent';
                this.linked = text.attr('href');

                title = text.text();
                container.addClass('cj-title-link').on('click', buttonClick);

            } else {

                container.off().removeClass('cj-title-link');

            }

            if (this.numTitles) title = (isOn + 1) + '/' + this.songTotal + ' - ' + title;

            title += ' ';
            width = this.titleWidth = getWidth(title, container);
            holder.css('margin-left', 0).html(title + title);

            if (canAnimate) {

                this.sheet.innerCSS(styles.split('(end)').join(-width + 'px').split('(time)').join((width * this.titleSpeed * 0.001).toFixed(1)));

            } else {

                this.tweenPos = 0;
                this.titleStop = -width;

            }

            this.hasTitle = true;
            if (this.isOver || this.visibleMeta) {

                if (!delay) {

                    this.moveText();
                    return;

                }

                var $this = this;
                this.moveDelay = setTimeout(function() {

                    $this.moveText();

                }, 500);

            }

        },

        /* plays text ticker when player bubble is visible */
        moveText: function() {

            if (!this.hasTitle) return;
            clearTimeout(this.moveDelay);

            if (canAnimate) {

                this.text.addClass('cj-title-move');

            } else {

                clearTimeout(this.tweenText);

                var $this = this;
                this.tweenText = setInterval(function() {

                    var tweenPos = $this.tweenPos;
                    tweenPos = $this.tweenPos = tweenPos > $this.titleStop ? tweenPos - 1 : 1;
                    $this.text.css('margin-left', tweenPos);

                }, this.titleSpeed);

            }

        },

        /* stops text ticker when player bubble is hidden */
        stopText: function() {

            if (!this.hasTitle) return;
            clearTimeout(this.moveDelay);

            if (canAnimate) {

                this.text.removeClass('cj-title-move');

            } else {

                clearInterval(this.tweenText);

            }

        },

        /* song title click */
        titleClick: function() {

            if (this.target === '_parent') {

                window.location = this.linked;

            } else {

                window.open(this.linked);

            }

        },

        /* shows player bubble */
        showMeta: function(forceOn) {

            if (this.forceOn) return;

            clearTimeout(this.delayTimer);
            if (canTransition) this.meta.addClass('cj-visible-meta');

            if (!this.isOver) {

                this.isOver = true;
                this.moveText();
                if (!canTransition) this.meta.fadeIn();

            }

            if (forceOn) {

                this.forceOn = true;
                this.forceOff = false;

            }

        },

        /* hides player bubble */
        hideMeta: function(forceOff) {

            if (!forceOff && this.forceOn) return;

            clearTimeout(this.delayTimer);
            if (canTransition) this.meta.removeClass('cj-visible-meta');

            var $this = this;
            this.delayTimer = setTimeout(function() {

                $this.isOver = false;
                $this.stopText();
                if (!canTransition) $this.meta.fadeOut();

            }, 750);

            if (forceOff) {

                this.forceOff = true;
                this.forceOn = false;

            }

        }

    };

    /* returns title width */
    function getWidth(st, container) {

        var span = $('<span class="cj-temp-title" />').html(st).appendTo(container),
            wid = span.width();
        span.remove();

        return canAnimate ? wid : wid - 1;

    }

    /* animates bars */
    function animate($this, bars) {

        if (!($this instanceof MusicPlayer)) {

            bars = $this[1];
            $this = $this[0];

        }

        var i = $this.barTotal,
            sets = $this.tweenSets,
            props = $this.props,
            high = $this.barHigh - 1;

        if (sets.onComplete) delete sets.onComplete;
        if (sets.onCompleteParams) delete sets.onCompleteParams;

        while (i--) {

            if (i === 0) {

                sets.onComplete = animate;
                sets.onCompleteParams = [$this, bars];

            }

            props.height = ((Math.random() * high) | 0) + 1;
            bars[i].animate(props, sets);

        }

    }

    /* returns mp3 or ogg url */
    function getSong(song) {

        return mp3 ? song : song.substring(0, song.lastIndexOf('.')) + '.ogg';

    }

    /* tweens volume up */
    function volumeUp(tick) {

        this.cjMusic.volume = tick * this.cjVolume;

    }

    /* tweens volume down */
    function volumeDown(tick) {

        this.cjMusic.volume = this.cjVolume * (1 - tick);

        if (tick === 1) this.cjMusic.pause();

    }

    /* popup bubble click events */
    function buttonClick() {

        var cls = this.attr('class'),

            evt = cls.search('playpause') !== -1 || cls.search('bars') !== -1 ? 'togglePlayPause' : cls.search('prevsong') !== -1 ? 'prevSong' : cls.search('nextsong') !== -1 ? 'nextSong' : 'titleClick';

        players[this.data('playerId')][evt]();

    }

    /* mouse over event */
    function showMeta() {

        players[this.data('playerId')].showMeta();

    }

    /* mouse out event */
    function hideMeta() {

        players[this.data('playerId')].hideMeta();

    }

    /* HTML5 Audio ended event */
    function audioEnded() {

        players[this.playerId].songEnded();

    }

    /* returns Flash fallback Object */
    function thisMovie(id) {

        return !isIE ? document[id] : window[id];

    }


})(jQuick);


/* called from Flash */
function cjMusicBars(id, method) {

    jQuick.cjMusicBars(id, method, [false, true]);

}
