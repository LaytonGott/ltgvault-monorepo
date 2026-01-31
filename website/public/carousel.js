// LTG Vault - Demo Carousel System
// Three completely separate demos with independent typing animations

(function() {
    'use strict';

    // ============ BACKGROUND EFFECTS ============

    // Generate floating particles
    var particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        for (var i = 0; i < 10; i++) {
            var particle = document.createElement('div');
            particle.className = 'particle particle-drift';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (20 + Math.random() * 15) + 's';
            particle.style.animationDelay = Math.random() * 20 + 's';
            var size = 1.5 + Math.random() * 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particlesContainer.appendChild(particle);
        }
        for (var i = 0; i < 10; i++) {
            var particle = document.createElement('div');
            particle.className = 'particle particle-float';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDuration = (25 + Math.random() * 20) + 's';
            particle.style.animationDelay = Math.random() * 10 + 's';
            var size = 2 + Math.random() * 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.opacity = 0.15 + Math.random() * 0.25;
            particlesContainer.appendChild(particle);
        }
    }

    // Gold twinkling stars
    var starsContainer = document.getElementById('starsContainer');
    if (starsContainer) {
        for (var i = 0; i < 25; i++) {
            var star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            var size = 4 + Math.random() * 8;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.setProperty('--duration', (3 + Math.random() * 4) + 's');
            star.style.setProperty('--delay', Math.random() * 5 + 's');
            star.style.setProperty('--max-opacity', (0.3 + Math.random() * 0.4).toString());
            starsContainer.appendChild(star);
        }
    }

    // LTG Sparkles
    var ltgSparklesContainer = document.getElementById('ltgSparkles');
    function createSparkle() {
        if (!ltgSparklesContainer) return;
        var sparkle = document.createElement('div');
        sparkle.className = 'ltg-sparkle';
        sparkle.style.left = (20 + Math.random() * 60) + '%';
        sparkle.style.top = (40 + Math.random() * 40) + '%';
        sparkle.style.animationDuration = (2 + Math.random() * 2) + 's';
        sparkle.style.width = (2 + Math.random() * 2) + 'px';
        sparkle.style.height = sparkle.style.width;
        ltgSparklesContainer.appendChild(sparkle);
        setTimeout(function() { sparkle.remove(); }, 4000);
    }
    setInterval(function() {
        if (Math.random() > 0.5) createSparkle();
    }, 800);

    // Header scroll effect
    var header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', function() {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // Fade in on scroll
    if ('IntersectionObserver' in window) {
        var fadeObserver = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('visible');
                }
            }
        }, { threshold: 0.1 });
        var fadeEls = document.querySelectorAll('.fade-up');
        for (var i = 0; i < fadeEls.length; i++) {
            fadeObserver.observe(fadeEls[i]);
        }
    }

    // ============ DEMO CAROUSEL ============

    // Get all elements - check if carousel exists first
    var carouselEl = document.getElementById('demoCarousel');
    if (!carouselEl) return;

    // Demo data
    var POSTUP_INPUT = "I built 3 chrome extensions in 3 days while everyone told me to focus on one thing. Now all 3 are getting users and I'm learning what actually works. Sometimes you just gotta ship and see what sticks instead of overthinking it for months.";
    var POSTUP_OUTPUT = "I just wrapped up building three Chrome extensions in three days. I know, I know, everyone keeps saying to focus on one thing, but I couldn't help myself.<br><br>Honestly, I was curious to see what would resonate with users. Now, all three are gaining traction, and I'm finally starting to understand what actually works in this space.<br><br>Sometimes, you just have to ship something and see what sticks instead of overthinking it for months. It feels good to take action, even if it's a little chaotic.";

    var CHAPTERGEN_INPUT = "hey everyone welcome back to the channel so today we're going to be breaking down the top five plays from last night and honestly some of these are absolutely insane starting with number five we've got mcdavid pulling off this incredible deke through three defenders and the way he moves is just unbelievable like how does he even do that then at number four we have ovechkin with another power play goal the guy just doesn't miss from that spot it's automatic at this point moving on to number three we've got matthews completing the hat trick and the crowd just went absolutely crazy you could barely hear anything and then at number two crosby with the overtime winner classic sid the kid moment and finally the number one play you're not gonna believe this one anyway that's gonna wrap it up for today don't forget to like and subscribe";
    var CHAPTERGEN_OUTPUT = '<span class="chapter-line"><span class="chapter-time">0:00</span> Intro</span><span class="chapter-line"><span class="chapter-time">0:15</span> Top 5 Plays Overview</span><span class="chapter-line"><span class="chapter-time">0:32</span> #5 McDavid\'s Deke</span><span class="chapter-line"><span class="chapter-time">1:47</span> #4 Ovechkin\'s Power Play Goal</span><span class="chapter-line"><span class="chapter-time">2:58</span> #3 Matthews Hat Trick</span><span class="chapter-line"><span class="chapter-time">4:12</span> #2 Crosby\'s OT Winner</span><span class="chapter-line"><span class="chapter-time">5:30</span> #1 Play of the Night</span><span class="chapter-line"><span class="chapter-time">6:45</span> Outro</span>';

    var THREADGEN_INPUT = "I spent $400 on DoorDash last month. Not because I was busy or working late. I just kept convincing myself I deserved it after long days. Now I'm meal prepping on Sundays and actually saving money. The food isn't as good but my bank account looks a lot better.";
    var THREADGEN_OUTPUT = '<div class="tweet"><div class="tweet-num">1/5</div><div class="tweet-text">I spent $400 on doordash last month. not because i was busy. i just kept telling myself i deserved it after long days</div></div><div class="tweet"><div class="tweet-num">2/5</div><div class="tweet-text">the thing is, i wasn\'t even enjoying most of those meals. half the time the food arrived cold or missing stuff</div></div><div class="tweet"><div class="tweet-num">3/5</div><div class="tweet-text">so i started meal prepping on sundays. nothing fancy, just rice, protein, and veggies for the week</div></div><div class="tweet"><div class="tweet-num">4/5</div><div class="tweet-text">the food isn\'t as exciting. but my bank account has an extra $300 in it now</div></div><div class="tweet"><div class="tweet-num">5/5</div><div class="tweet-text">sometimes the boring option is the right one</div></div>';

    // State
    var currentDemo = 'postup';
    var carouselVisible = false;
    var postupInterval = null;
    var chaptergenInterval = null;
    var threadgenInterval = null;
    var timeouts = [];

    // Elements - PostUp
    var postupSection = document.getElementById('demo-postup');
    var postupInput = document.getElementById('postup-input');
    var postupOutput = document.getElementById('postup-output');
    var postupBtn = document.getElementById('postup-btn');
    var postupCopy = document.getElementById('postup-copy');

    // Elements - ChapterGen
    var chaptergenSection = document.getElementById('demo-chaptergen');
    var chaptergenInput = document.getElementById('chaptergen-input');
    var chaptergenOutput = document.getElementById('chaptergen-output');
    var chaptergenBtn = document.getElementById('chaptergen-btn');
    var chaptergenCopy = document.getElementById('chaptergen-copy');

    // Elements - ThreadGen
    var threadgenSection = document.getElementById('demo-threadgen');
    var threadgenInput = document.getElementById('threadgen-input');
    var threadgenOutput = document.getElementById('threadgen-output');
    var threadgenBtn = document.getElementById('threadgen-btn');
    var threadgenCopy = document.getElementById('threadgen-copy');

    // Indicators
    var indicatorPostup = document.getElementById('indicator-postup');
    var indicatorChaptergen = document.getElementById('indicator-chaptergen');
    var indicatorThreadgen = document.getElementById('indicator-threadgen');
    var captionEl = document.getElementById('demo-caption');

    // Clear all animations
    function clearAll() {
        if (postupInterval) { clearInterval(postupInterval); postupInterval = null; }
        if (chaptergenInterval) { clearInterval(chaptergenInterval); chaptergenInterval = null; }
        if (threadgenInterval) { clearInterval(threadgenInterval); threadgenInterval = null; }
        for (var i = 0; i < timeouts.length; i++) {
            clearTimeout(timeouts[i]);
        }
        timeouts = [];
    }

    // Reset PostUp demo
    function resetPostup() {
        if (postupInput) postupInput.innerHTML = '';
        if (postupOutput) { postupOutput.innerHTML = ''; postupOutput.classList.remove('visible'); }
        if (postupBtn) { postupBtn.classList.remove('active', 'loading'); }
        if (postupCopy) { postupCopy.classList.remove('visible', 'copied'); var s = postupCopy.querySelector('span'); if (s) s.textContent = 'Copy to clipboard'; }
    }

    // Reset ChapterGen demo
    function resetChaptergen() {
        if (chaptergenInput) chaptergenInput.innerHTML = '';
        if (chaptergenOutput) { chaptergenOutput.innerHTML = ''; chaptergenOutput.classList.remove('visible'); }
        if (chaptergenBtn) { chaptergenBtn.classList.remove('active', 'loading'); }
        if (chaptergenCopy) { chaptergenCopy.classList.remove('visible', 'copied'); var s = chaptergenCopy.querySelector('span'); if (s) s.textContent = 'Copy to clipboard'; }
    }

    // Reset ThreadGen demo
    function resetThreadgen() {
        if (threadgenInput) threadgenInput.innerHTML = '';
        if (threadgenOutput) { threadgenOutput.innerHTML = ''; threadgenOutput.classList.remove('visible'); }
        if (threadgenBtn) { threadgenBtn.classList.remove('active', 'loading'); }
        if (threadgenCopy) { threadgenCopy.classList.remove('visible', 'copied'); var s = threadgenCopy.querySelector('span'); if (s) s.textContent = 'Copy to clipboard'; }
    }

    // Run PostUp demo
    function runPostup() {
        if (currentDemo !== 'postup') return;
        var charIndex = 0;
        postupInput.innerHTML = '<span class="cursor"></span>';

        postupInterval = setInterval(function() {
            if (currentDemo !== 'postup') { clearInterval(postupInterval); return; }
            if (charIndex < POSTUP_INPUT.length) {
                postupInput.innerHTML = POSTUP_INPUT.slice(0, charIndex + 1) + '<span class="cursor"></span>';
                charIndex++;
            } else {
                clearInterval(postupInterval);
                postupInterval = null;
                postupInput.innerHTML = POSTUP_INPUT;
                postupBtn.classList.add('active');

                var t1 = setTimeout(function() {
                    if (currentDemo !== 'postup') return;
                    postupBtn.classList.add('loading');
                    postupBtn.classList.remove('active');

                    var t2 = setTimeout(function() {
                        if (currentDemo !== 'postup') return;
                        postupBtn.classList.remove('loading');
                        postupBtn.classList.add('active');
                        postupOutput.innerHTML = POSTUP_OUTPUT;
                        postupOutput.classList.add('visible');

                        var t3 = setTimeout(function() {
                            if (currentDemo !== 'postup') return;
                            postupCopy.classList.add('visible');

                            var t4 = setTimeout(function() {
                                if (currentDemo !== 'postup') return;
                                postupCopy.classList.add('copied');
                                var s = postupCopy.querySelector('span');
                                if (s) s.textContent = 'Copied!';

                                var t5 = setTimeout(function() {
                                    if (carouselVisible) switchTo('chaptergen');
                                }, 2500);
                                timeouts.push(t5);
                            }, 1200);
                            timeouts.push(t4);
                        }, 600);
                        timeouts.push(t3);
                    }, 1500);
                    timeouts.push(t2);
                }, 800);
                timeouts.push(t1);
            }
        }, 25);
    }

    // Run ChapterGen demo
    function runChaptergen() {
        if (currentDemo !== 'chaptergen') return;
        var charIndex = 0;
        chaptergenInput.innerHTML = '<span class="cursor"></span>';

        chaptergenInterval = setInterval(function() {
            if (currentDemo !== 'chaptergen') { clearInterval(chaptergenInterval); return; }
            if (charIndex < CHAPTERGEN_INPUT.length) {
                chaptergenInput.innerHTML = CHAPTERGEN_INPUT.slice(0, charIndex + 1) + '<span class="cursor"></span>';
                charIndex++;
            } else {
                clearInterval(chaptergenInterval);
                chaptergenInterval = null;
                chaptergenInput.innerHTML = CHAPTERGEN_INPUT;
                chaptergenBtn.classList.add('active');

                var t1 = setTimeout(function() {
                    if (currentDemo !== 'chaptergen') return;
                    chaptergenBtn.classList.add('loading');
                    chaptergenBtn.classList.remove('active');

                    var t2 = setTimeout(function() {
                        if (currentDemo !== 'chaptergen') return;
                        chaptergenBtn.classList.remove('loading');
                        chaptergenBtn.classList.add('active');
                        chaptergenOutput.innerHTML = CHAPTERGEN_OUTPUT;
                        chaptergenOutput.classList.add('visible');

                        var t3 = setTimeout(function() {
                            if (currentDemo !== 'chaptergen') return;
                            chaptergenCopy.classList.add('visible');

                            var t4 = setTimeout(function() {
                                if (currentDemo !== 'chaptergen') return;
                                chaptergenCopy.classList.add('copied');
                                var s = chaptergenCopy.querySelector('span');
                                if (s) s.textContent = 'Copied!';

                                var t5 = setTimeout(function() {
                                    if (carouselVisible) switchTo('threadgen');
                                }, 2500);
                                timeouts.push(t5);
                            }, 1200);
                            timeouts.push(t4);
                        }, 600);
                        timeouts.push(t3);
                    }, 1500);
                    timeouts.push(t2);
                }, 800);
                timeouts.push(t1);
            }
        }, 8); // Faster for longer text
    }

    // Run ThreadGen demo
    function runThreadgen() {
        if (currentDemo !== 'threadgen') return;
        var charIndex = 0;
        threadgenInput.innerHTML = '<span class="cursor"></span>';

        threadgenInterval = setInterval(function() {
            if (currentDemo !== 'threadgen') { clearInterval(threadgenInterval); return; }
            if (charIndex < THREADGEN_INPUT.length) {
                threadgenInput.innerHTML = THREADGEN_INPUT.slice(0, charIndex + 1) + '<span class="cursor"></span>';
                charIndex++;
            } else {
                clearInterval(threadgenInterval);
                threadgenInterval = null;
                threadgenInput.innerHTML = THREADGEN_INPUT;
                threadgenBtn.classList.add('active');

                var t1 = setTimeout(function() {
                    if (currentDemo !== 'threadgen') return;
                    threadgenBtn.classList.add('loading');
                    threadgenBtn.classList.remove('active');

                    var t2 = setTimeout(function() {
                        if (currentDemo !== 'threadgen') return;
                        threadgenBtn.classList.remove('loading');
                        threadgenBtn.classList.add('active');
                        threadgenOutput.innerHTML = THREADGEN_OUTPUT;
                        threadgenOutput.classList.add('visible');

                        var t3 = setTimeout(function() {
                            if (currentDemo !== 'threadgen') return;
                            threadgenCopy.classList.add('visible');

                            var t4 = setTimeout(function() {
                                if (currentDemo !== 'threadgen') return;
                                threadgenCopy.classList.add('copied');
                                var s = threadgenCopy.querySelector('span');
                                if (s) s.textContent = 'Copied!';

                                var t5 = setTimeout(function() {
                                    if (carouselVisible) switchTo('postup');
                                }, 2500);
                                timeouts.push(t5);
                            }, 1200);
                            timeouts.push(t4);
                        }, 600);
                        timeouts.push(t3);
                    }, 1500);
                    timeouts.push(t2);
                }, 800);
                timeouts.push(t1);
            }
        }, 25);
    }

    // Switch to a demo
    function switchTo(demo) {
        clearAll();
        resetPostup();
        resetChaptergen();
        resetThreadgen();

        currentDemo = demo;

        // Hide all sections
        if (postupSection) postupSection.classList.remove('active');
        if (chaptergenSection) chaptergenSection.classList.remove('active');
        if (threadgenSection) threadgenSection.classList.remove('active');

        // Remove active from all indicators
        if (indicatorPostup) indicatorPostup.classList.remove('active');
        if (indicatorChaptergen) indicatorChaptergen.classList.remove('active');
        if (indicatorThreadgen) indicatorThreadgen.classList.remove('active');

        // Show the right section and update indicator
        if (demo === 'postup') {
            if (postupSection) postupSection.classList.add('active');
            if (indicatorPostup) indicatorPostup.classList.add('active');
            if (captionEl) captionEl.textContent = 'PostUp in action';
            var t = setTimeout(runPostup, 300);
            timeouts.push(t);
        } else if (demo === 'chaptergen') {
            if (chaptergenSection) chaptergenSection.classList.add('active');
            if (indicatorChaptergen) indicatorChaptergen.classList.add('active');
            if (captionEl) captionEl.textContent = 'ChapterGen in action';
            var t = setTimeout(runChaptergen, 300);
            timeouts.push(t);
        } else if (demo === 'threadgen') {
            if (threadgenSection) threadgenSection.classList.add('active');
            if (indicatorThreadgen) indicatorThreadgen.classList.add('active');
            if (captionEl) captionEl.textContent = 'ThreadGen in action';
            var t = setTimeout(runThreadgen, 300);
            timeouts.push(t);
        }
    }

    // Click handlers for indicators
    if (indicatorPostup) {
        indicatorPostup.addEventListener('click', function() { switchTo('postup'); });
    }
    if (indicatorChaptergen) {
        indicatorChaptergen.addEventListener('click', function() { switchTo('chaptergen'); });
    }
    if (indicatorThreadgen) {
        indicatorThreadgen.addEventListener('click', function() { switchTo('threadgen'); });
    }

    // Start carousel when visible
    if ('IntersectionObserver' in window) {
        var carouselObserver = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting && !carouselVisible) {
                    carouselVisible = true;
                    switchTo('postup');
                } else if (!entries[i].isIntersecting && carouselVisible) {
                    carouselVisible = false;
                    clearAll();
                }
            }
        }, { threshold: 0.3 });
        carouselObserver.observe(carouselEl);
    } else {
        carouselVisible = true;
        switchTo('postup');
    }

    // Fallback auto-start
    setTimeout(function() {
        if (!carouselVisible) {
            carouselVisible = true;
            switchTo('postup');
        }
    }, 2000);

    // Smooth scroll for anchor links
    var anchors = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i++) {
        anchors[i].addEventListener('click', function(e) {
            e.preventDefault();
            var href = this.getAttribute('href');
            var target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
})();
