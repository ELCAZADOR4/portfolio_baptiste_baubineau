const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if ("IntersectionObserver" in window && typeof Element.prototype.animate === "function") {
    const activeReveals = new Set();
    const revealObserver = new IntersectionObserver(entries => {
        for (const { target, isIntersecting } of entries) {
            if (!isIntersecting) continue;
            revealObserver.unobserve(target);
            if (reduceMotion.matches || target.matches(":focus-within")) continue;
            const animation = target.animate(
                [{ opacity: 0, translate: "0 26px" }, { opacity: 1, translate: "0 0" }],
                { duration: 720, easing: "cubic-bezier(.22, 1, .36, 1)" }
            );
            activeReveals.add(animation);
            animation.onfinish = animation.oncancel = () => activeReveals.delete(animation);
        }
    }, { threshold: .12 });

    document.querySelectorAll("[data-reveal]").forEach(section => revealObserver.observe(section));
    document.addEventListener("focusin", event => {
        for (const animation of activeReveals) {
            if (animation.effect.target.contains(event.target)) animation.finish();
        }
    });
    reduceMotion.addEventListener("change", event => {
        if (event.matches) activeReveals.forEach(animation => animation.cancel());
    });
}

for (const canvas of document.querySelectorAll("[data-particles]")) {
    const context = canvas.getContext("2d");
    if (!context) continue;

    const points = Array.from({ length: 224 }, (_, index) => ({
        angle: index * 2.399963,
        radius: Math.sqrt(index / 224),
        size: index % 9 === 0 ? 2.4 : .75 + (index % 5) * .15,
        shade: index % 7 === 0 ? "#a3edfe" : index % 3 === 0 ? "#adbaff" : "#7099f2"
    }));
    let width = 0;
    let height = 0;
    let frame = 0;
    let started = 0;
    let visible = !("IntersectionObserver" in window);
    let pointer = null;

    function draw(time = 0) {
        context.clearRect(0, 0, width, height);
        const spread = Math.min(width, height) * .56;
        const centerX = width * .51;
        const centerY = height * .5;
        for (const point of points) {
            const phase = point.angle + time * (.19 + point.radius * .15);
            let x = centerX + Math.cos(phase) * point.radius * Math.min(width * .46, spread * 1.45);
            let y = centerY + Math.sin(phase * 1.07 + point.radius * 4) * point.radius * spread * .75;
            if (pointer) {
                const dx = x - pointer.x;
                const dy = y - pointer.y;
                const distance = Math.hypot(dx, dy);
                const influence = Math.max(0, 1 - distance / 110);
                x += dx * influence * .22;
                y += dy * influence * .22;
            }
            context.globalAlpha = .46 + (1 - point.radius) * .54;
            context.fillStyle = point.shade;
            context.beginPath();
            context.arc(x, y, point.size, 0, Math.PI * 2);
            context.fill();
        }
    }

    function tick(now) {
        frame = 0;
        if (!visible || reduceMotion.matches) return;
        const elapsed = now - started;
        draw(elapsed / 1000);
        if (elapsed < 2500) frame = requestAnimationFrame(tick);
    }

    function resize() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        draw();
    }

    canvas.addEventListener("pointermove", event => {
        if (event.pointerType === "touch" || reduceMotion.matches) return;
        const box = canvas.getBoundingClientRect();
        pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
        if (!frame) draw();
    });
    canvas.addEventListener("pointerleave", () => {
        pointer = null;
        if (!frame) draw();
    });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
    resize();

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) {
                visible = false;
                cancelAnimationFrame(frame);
                frame = 0;
                return;
            }
            visible = true;
            if (!reduceMotion.matches) {
                started = performance.now();
                frame = requestAnimationFrame(tick);
            }
        }, { threshold: .25 });
        observer.observe(canvas);
    }
    reduceMotion.addEventListener("change", event => {
        if (!event.matches) return;
        cancelAnimationFrame(frame);
        frame = 0;
        pointer = null;
        draw();
    });
}
