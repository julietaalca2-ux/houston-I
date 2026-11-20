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
    brake: false,
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false
  };

  const settings = {
    mode: 'auto',
    showJoystick: true,
    sensitivity: 1.0,
    buttonSize: 'normal',
    opacity: 0.85,
    carSteerMode: 'buttons',
    swapSides: false
  };

  let blocked = false;
  let currentInCar = false;
  let callbacks = {
    onEnterExit: null,
    onHorn: null,
    onGarage: null,
    onStory: null,
    onTalk: null,
    onMenu: null,
    onMap: null,
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

  function applyTouchVisualSettings() {
    if (!dom.touchLayer) return;
    const shouldShow =
      settings.mode === 'on' || (settings.mode === 'auto' && isTouchDevice());
    dom.touchLayer.classList.toggle('visible', shouldShow);
    dom.touchLayer.classList.toggle('swap-sides', Boolean(settings.swapSides));
    dom.touchLayer.dataset.steerMode = settings.carSteerMode || 'buttons';

    const scaleMap = { compact: '0.86', normal: '1', large: '1.14' };
    dom.touchLayer.style.setProperty('--touch-scale', scaleMap[settings.buttonSize] || '1');
    dom.touchLayer.style.setProperty('--touch-opacity', String(settings.opacity));

    if (dom.joyZone) {
      dom.joyZone.classList.toggle('hidden', !settings.showJoystick);
    }
    if (dom.dpadZone) {
      dom.dpadZone.classList.toggle('hidden', Boolean(settings.showJoystick));
    }
    if (dom.carJoyZone) {
      const useCarJoy = currentInCar && settings.carSteerMode === 'joystick' && settings.showJoystick;
      dom.carJoyZone.classList.toggle('hidden', !useCarJoy);
    }
    if (dom.steerGroup) {
      const hideSteerBtns = currentInCar && settings.carSteerMode === 'joystick' && settings.showJoystick;
      dom.steerGroup.classList.toggle('hidden', hideSteerBtns);
    }
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

  function setupJoystickInstance(zone, base, stick) {
    if (!zone || !base || !stick) return () => {};
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

      const sens = Math.max(0.5, Math.min(2.0, Number(settings.sensitivity) || 1.0));
      let normX = (dx / maxRadius) * sens;
      let normY = (dy / maxRadius) * sens;
      const mag = Math.hypot(normX, normY);
      if (mag > 1) {
        normX /= mag;
        normY /= mag;
      }
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

    return () => resetStick({});
  }

  let resetFootJoyFn = () => {};
  let resetCarJoyFn = () => {};

  return {
    init(handlers) {
      callbacks = Object.assign(callbacks, handlers || {});

      dom = {
        gameFrame: document.getElementById('game-frame'),
        touchLayer: document.getElementById('touch-layer'),
        joyZone: document.getElementById('joy-zone'),
        joyBase: document.getElementById('joy-base'),
        joyStick: document.getElementById('joy-stick'),
        dpadZone: document.getElementById('dpad-zone'),
        btnDpadUp: document.getElementById('btn-dpad-up'),
        btnDpadDown: document.getElementById('btn-dpad-down'),
        btnDpadLeft: document.getElementById('btn-dpad-left'),
        btnDpadRight: document.getElementById('btn-dpad-right'),
        carJoyZone: document.getElementById('car-joy-zone'),
        carJoyBase: document.getElementById('car-joy-base'),
        carJoyStick: document.getElementById('car-joy-stick'),
        steerGroup: document.getElementById('steer-group'),
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

          if (k === 'escape' || k === 'p') {
            if (callbacks.onMenu) callbacks.onMenu(k === 'escape');
            return;
          }
          if (k === 'm') {
            if (callbacks.onMap) callbacks.onMap();
            return;
          }
          if (k === 'g') {
            if (callbacks.onGarage) callbacks.onGarage(false);
          }
          if (k === 'h') {
            if (callbacks.onStory) callbacks.onStory(false);
          }
          if (!blocked) {
            if (k === 'e' && callbacks.onEnterExit) callbacks.onEnterExit();
            if (k === 'f' && callbacks.onTalk) callbacks.onTalk();
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

      resetFootJoyFn = setupJoystickInstance(dom.joyZone, dom.joyBase, dom.joyStick);
      resetCarJoyFn = setupJoystickInstance(dom.carJoyZone, dom.carJoyBase, dom.carJoyStick);

      bindHoldButton(dom.btnSprint, 'sprint');
      bindHoldButton(dom.btnSteerLeft, 'steerLeft');
      bindHoldButton(dom.btnSteerRight, 'steerRight');
      bindHoldButton(dom.btnGas, 'gas');
      bindHoldButton(dom.btnBrake, 'brake');
      bindHoldButton(dom.btnDpadUp, 'dpadUp');
      bindHoldButton(dom.btnDpadDown, 'dpadDown');
      bindHoldButton(dom.btnDpadLeft, 'dpadLeft');
      bindHoldButton(dom.btnDpadRight, 'dpadRight');

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

      window.addEventListener('resize', applyTouchVisualSettings);
      applyTouchVisualSettings();
    },

    applySettings(touchSettings) {
      if (!touchSettings) return;
      Object.assign(settings, touchSettings);
      applyTouchVisualSettings();
    },

    getSettings() {
      return Object.assign({}, settings);
    },

    setTouchMode(mode) {
      settings.mode = mode;
      applyTouchVisualSettings();
    },

    setJoystickVisible(visible) {
      settings.showJoystick = Boolean(visible);
      applyTouchVisualSettings();
    },

    setJoystickSensitivity(sens) {
      settings.sensitivity = Math.max(0.5, Math.min(2.0, Number(sens) || 1.0));
    },

    setButtonSize(size) {
      settings.buttonSize = size;
      applyTouchVisualSettings();
    },

    setOpacity(val) {
      settings.opacity = Math.max(0.35, Math.min(1.0, Number(val) || 0.85));
      applyTouchVisualSettings();
    },

    setCarSteerMode(mode) {
      settings.carSteerMode = mode === 'joystick' ? 'joystick' : 'buttons';
      applyTouchVisualSettings();
    },

    setSwapSides(swap) {
      settings.swapSides = Boolean(swap);
      applyTouchVisualSettings();
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
      touch.dpadUp = false;
      touch.dpadDown = false;
      touch.dpadLeft = false;
      touch.dpadRight = false;
      resetFootJoyFn();
      resetCarJoyFn();
      document.querySelectorAll('.t-btn.pressed').forEach((b) => b.classList.remove('pressed'));
    },

    setMode(inCar) {
      currentInCar = Boolean(inCar);
      if (!dom.touchLayer) return;
      const nextMode = currentInCar ? 'car' : 'foot';
      if (dom.touchLayer.dataset.mode !== nextMode) {
        this.clearTouchState();
        dom.touchLayer.dataset.mode = nextMode;
      }
      applyTouchVisualSettings();
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

    getFootInput() {
      if (blocked) return { dx: 0, dy: 0, sprint: false };
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('arrowleft') || touch.dpadLeft) dx -= 1;
      if (keys.has('d') || keys.has('arrowright') || touch.dpadRight) dx += 1;
      if (keys.has('w') || keys.has('arrowup') || touch.dpadUp) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown') || touch.dpadDown) dy += 1;

      if (settings.showJoystick && (Math.abs(touch.joyX) > 0 || Math.abs(touch.joyY) > 0)) {
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
      if (settings.carSteerMode === 'joystick' && settings.showJoystick && Math.abs(touch.joyX) > 0.05) {
        steer = Math.max(-1, Math.min(1, touch.joyX));
      }
      const turbo = keys.has('shift');
      const handbrake = keys.has(' ');
      return { throttle, brake, steer, turbo, handbrake };
    }
  };
})();
