window.CiudadCero = window.CiudadCero || {};

CiudadCero.Input = (() => {
  const keys = new Set();

  const touch = {
    joyX: 0,
    joyY: 0,
    joyActive: false,
    sprint: false,
    steerLeft: false,
    steerRight: false,
    gas: false,
    brake: false
  };

  let touchMode = 'auto';
  let blocked = false;
  let callbacks = {
    onEnterExit: null,
    onReset: null,
    onHorn: null,
    onGarage: null,
    onStory: null,
    onTalk: null,
    onAdvanceDialogue: null
  };

  let dom = {};

  function isTouchDevice() {
    return (
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
    );
  }

  function updateTouchVisibility() {
    if (!dom.touchLayer) return;
    const shouldShow =
      touchMode === 'on' || (touchMode === 'auto' && isTouchDevice());
    dom.touchLayer.classList.toggle('visible', shouldShow);
  }

  function bindHoldButton(el, propName) {
    if (!el) return;
    let activePointer = null;

    const release = (e) => {
      if (activePointer !== null && e.pointerId !== activePointer) return;
      activePointer = null;
      touch[propName] = false;
      el.classList.remove('pressed');
    };

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      CiudadCero.Audio.unlock();
      if (blocked) return;
      if (activePointer !== null) return;
      activePointer = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      touch[propName] = true;
      el.classList.add('pressed');
    });

    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
  }

  function bindTapButton(el, actionFn) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      CiudadCero.Audio.unlock();
      el.classList.add('pressed');
      if (typeof actionFn === 'function') actionFn();
    });
    const clear = () => el.classList.remove('pressed');
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointercancel', clear);
  }

  function setupJoystick() {
    const zone = dom.joyZone;
    const base = dom.joyBase;
    const stick = dom.joyStick;
    if (!zone || !base || !stick) return;

    let pointerId = null;
    const maxRadius = 38;

    function updateStick(clientX, clientY) {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      stick.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;

      const normX = dx / maxRadius;
      const normY = dy / maxRadius;
      const mag = Math.hypot(normX, normY);
      if (mag < 0.14) {
        touch.joyX = 0;
        touch.joyY = 0;
      } else {
        touch.joyX = normX;
        touch.joyY = normY;
      }
    }

    function resetStick(e) {
      if (pointerId !== null && e && e.pointerId !== undefined && e.pointerId !== pointerId) {
        return;
      }
      pointerId = null;
      touch.joyActive = false;
      touch.joyX = 0;
      touch.joyY = 0;
      stick.style.transform = 'translate(0px, 0px)';
    }

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      CiudadCero.Audio.unlock();
      if (blocked) return;
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      touch.joyActive = true;
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      updateStick(e.clientX, e.clientY);
    });

    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pointerId) return;
      e.preventDefault();
      if (blocked) {
        resetStick(e);
        return;
      }
      updateStick(e.clientX, e.clientY);
    });

    zone.addEventListener('pointerup', resetStick);
    zone.addEventListener('pointercancel', resetStick);
    zone.addEventListener('lostpointercapture', resetStick);
  }

  return {
    init(handlers) {
      callbacks = Object.assign(callbacks, handlers || {});

      dom = {
        gameFrame: document.getElementById('game-frame'),
        touchLayer: document.getElementById('touch-layer'),
        joyZone: document.getElementById('joy-zone'),
        joyBase: document.getElementById('joy-base'),
        joyStick: document.getElementById('joy-stick'),
        btnSprint: document.getElementById('btn-sprint'),
        btnEnterFoot: document.getElementById('btn-enter-foot'),
        btnSteerLeft: document.getElementById('btn-steer-left'),
        btnSteerRight: document.getElementById('btn-steer-right'),
        btnGas: document.getElementById('btn-gas'),
        btnBrake: document.getElementById('btn-brake'),
        btnExitCar: document.getElementById('btn-exit-car'),
        btnHornCar: document.getElementById('btn-horn-car'),
        btnGarageTouch: document.getElementById('btn-garage-touch'),
        btnTalkTouch: document.getElementById('btn-talk-touch')
      };

      window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
          e.preventDefault();
        }
        CiudadCero.Audio.unlock();

        if (!e.repeat) {
          if (CiudadCero.Story && CiudadCero.Story.isDialogueOpen()) {
            if ([' ', 'enter', 'e', 'f'].includes(k)) {
              if (callbacks.onAdvanceDialogue) callbacks.onAdvanceDialogue();
            }
            return;
          }

          if (k === 'g' || k === 'escape') {
            if (callbacks.onGarage) callbacks.onGarage(k === 'escape');
          }
          if (k === 'h' || k === 'escape') {
            if (callbacks.onStory) callbacks.onStory(k === 'escape');
          }
          if (!blocked) {
            if (k === 'e' && callbacks.onEnterExit) callbacks.onEnterExit();
            if (k === 'f' && callbacks.onTalk) callbacks.onTalk();
            if (k === 'r' && callbacks.onReset) callbacks.onReset();
            if (k === ' ' && callbacks.onHorn) callbacks.onHorn();
          }
        }
        keys.add(k);
      });

      window.addEventListener('keyup', (e) => {
        keys.delete(e.key.toLowerCase());
      });

      window.addEventListener('blur', () => {
        keys.clear();
        this.clearTouchState();
      });

      if (dom.gameFrame) {
        dom.gameFrame.addEventListener('contextmenu', (e) => e.preventDefault());
        dom.gameFrame.addEventListener('gesturestart', (e) => e.preventDefault());
        dom.gameFrame.addEventListener('gesturechange', (e) => e.preventDefault());
      }

      setupJoystick();
      bindHoldButton(dom.btnSprint, 'sprint');
      bindHoldButton(dom.btnSteerLeft, 'steerLeft');
      bindHoldButton(dom.btnSteerRight, 'steerRight');
      bindHoldButton(dom.btnGas, 'gas');
      bindHoldButton(dom.btnBrake, 'brake');

      bindTapButton(dom.btnEnterFoot, () => {
        if (!blocked && callbacks.onEnterExit) callbacks.onEnterExit();
      });
      bindTapButton(dom.btnExitCar, () => {
        if (!blocked && callbacks.onEnterExit) callbacks.onEnterExit();
      });
      bindTapButton(dom.btnHornCar, () => {
        if (!blocked && callbacks.onHorn) callbacks.onHorn();
      });
      bindTapButton(dom.btnGarageTouch, () => {
        if (callbacks.onGarage) callbacks.onGarage(false);
      });
      bindTapButton(dom.btnTalkTouch, () => {
        if (!blocked && callbacks.onTalk) callbacks.onTalk();
      });

      window.addEventListener('resize', updateTouchVisibility);
      updateTouchVisibility();
    },

    setBlocked(isBlocked) {
      blocked = Boolean(isBlocked);
      if (blocked) {
        keys.clear();
        this.clearTouchState();
      }
    },

    clearTouchState() {
      touch.joyX = 0;
      touch.joyY = 0;
      touch.joyActive = false;
      touch.sprint = false;
      touch.steerLeft = false;
      touch.steerRight = false;
      touch.gas = false;
      touch.brake = false;
      if (dom.joyStick) dom.joyStick.style.transform = 'translate(0px, 0px)';
      document.querySelectorAll('.t-btn.pressed').forEach((b) => b.classList.remove('pressed'));
    },

    setMode(inCar) {
      if (!dom.touchLayer) return;
      const nextMode = inCar ? 'car' : 'foot';
      if (dom.touchLayer.dataset.mode !== nextMode) {
        this.clearTouchState();
        dom.touchLayer.dataset.mode = nextMode;
      }
    },

    setNearbyVehicle(isNear) {
      if (dom.btnEnterFoot) {
        dom.btnEnterFoot.classList.toggle('nearby', Boolean(isNear));
      }
    },

    setNearbyGarage(isNear) {
      if (dom.btnGarageTouch) {
        dom.btnGarageTouch.classList.toggle('hidden', !isNear);
      }
    },

    setNearbyNPC(isNear) {
      if (dom.btnTalkTouch) {
        dom.btnTalkTouch.classList.toggle('hidden', !isNear);
      }
    },

    cycleTouchMode() {
      if (touchMode === 'auto') touchMode = 'on';
      else if (touchMode === 'on') touchMode = 'off';
      else touchMode = 'auto';
      updateTouchVisibility();
      return touchMode;
    },

    getTouchModeLabel() {
      if (touchMode === 'on') return 'TÁCTIL: ON';
      if (touchMode === 'off') return 'TÁCTIL: OFF';
      return 'TÁCTIL: AUTO';
    },

    getFootInput() {
      if (blocked) return { dx: 0, dy: 0, sprint: false };
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;

      if (Math.abs(touch.joyX) > 0 || Math.abs(touch.joyY) > 0) {
        dx = touch.joyX;
        dy = touch.joyY;
      }

      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }

      const sprint = keys.has('shift') || touch.sprint;
      return { dx, dy, sprint };
    },

    getCarInput() {
      if (blocked) {
        return { throttle: 0, brake: 0, steer: 0, turbo: false, handbrake: false };
      }
      const throttle =
        keys.has('w') || keys.has('arrowup') || touch.gas ? 1 : 0;
      const brake =
        keys.has('s') || keys.has('arrowdown') || touch.brake ? 1 : 0;
      let steer = 0;
      if (keys.has('a') || keys.has('arrowleft') || touch.steerLeft) steer -= 1;
      if (keys.has('d') || keys.has('arrowright') || touch.steerRight) steer += 1;
      const turbo = keys.has('shift');
      const handbrake = keys.has(' ');
      return { throttle, brake, steer, turbo, handbrake };
    }
  };
})();
