(function () {
    const panel = document.querySelector('.author-content.author-content-item.single')
    if (!panel) return

    const canvas = document.createElement('canvas')
    canvas.id = 'header_canvas'
    canvas.style.position = 'absolute'
    canvas.style.bottom = '0'
    panel.appendChild(canvas)
    panel.parentNode.className = 'thumbnail_canvas'

    const context = canvas.getContext('2d')
    if (!context) return

    const controller = new AbortController()
    let animationFrame = null
    let width = 0
    let height = 0
    let bubbles = []

    function resize() {
        const container = document.querySelector('.thumbnail_canvas')
        if (!container) return
        width = container.offsetWidth
        height = container.offsetHeight
        canvas.width = width
        canvas.height = height
    }

    class Bubble {
        constructor() {
            this.position = {x: 0, y: 0}
            this.reset()
        }

        reset() {
            this.position.x = Math.random() * width
            this.position.y = height + 100 * Math.random()
            this.alpha = 0.1 + 0.5 * Math.random()
            this.alphaChange = 0.0002 + 0.0005 * Math.random()
            this.scale = 0.2 + 0.8 * Math.random()
            this.scaleChange = 0.002 * Math.random()
            this.speed = 0.1 + 0.4 * Math.random()
        }

        draw() {
            if (this.alpha <= 0) this.reset()
            this.position.y -= this.speed
            this.alpha -= this.alphaChange
            this.scale += this.scaleChange
            context.beginPath()
            context.arc(this.position.x, this.position.y, 10 * this.scale, 0, 2 * Math.PI, false)
            context.fillStyle = `rgba(255,255,255,${this.alpha})`
            context.fill()
        }
    }

    function animate() {
        context.clearRect(0, 0, width, height)
        bubbles.forEach(bubble => bubble.draw())
        animationFrame = requestAnimationFrame(animate)
    }

    resize()
    bubbles = Array.from({length: Math.ceil(0.04 * width)}, () => new Bubble())
    animate()
    window.addEventListener('resize', resize, {signal: controller.signal})
    document.addEventListener('hanlo:page:destroy', function () {
        controller.abort()
        if (animationFrame !== null) cancelAnimationFrame(animationFrame)
        bubbles = []
    }, {once: true})
})()
