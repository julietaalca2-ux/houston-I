window.CiudadCero = window.CiudadCero || {};

CiudadCero.UI = (() => {
  let els = {};
  let toastTimer = 0;

  function init(handlers) {
    els = {
      money: document.getElementById('money'),
      status: document.getElementById('status'),
      missionsCount: document.getElementById('missions-count'),
      wanted: document.getElementById('wanted'),
      missionTitle: document.getElementById('mission-title'),
      missionHelp: document.getElementById('mission-help'),
      missionDist: document.getElementById('mission-dist'),
      vehicleHud: document.getElementById('vehicle-hud'),
      vehModel: document.getElementById('veh-model'),
      vehSpeed: document.getElementById('veh-speed'),
      toast: document.getElementById('toast'),
      btnAudio: document.getElementById('btn-audio'),
      btnTouchToggle: document.getElementById('btn-touch-toggle'),
      btnReset: document.getElementById('btn-reset')
    };

    if (els.btnAudio) {
      els.btnAudio.classList.add('active');
      els.btnAudio.addEventListener('click', () => {
        const on = CiudadCero.Audio.toggle();
        els.btnAudio.textContent = on ? 'SONIDO: ON' : 'SONIDO: OFF';
        els.btnAudio.classList.toggle('active', on);
      });
    }

    if (els.btnTouchToggle) {
      els.btnTouchToggle.addEventListener('click', () => {
        CiudadCero.Input.cycleTouchMode();
        els.btnTouchToggle.textContent = CiudadCero.Input.getTouchModeLabel();
      });
    }

    if (els.btnReset && handlers && handlers.onReset) {
      els.btnReset.addEventListener('click', () => {
        handlers.onReset();
      });
    }
  }

  function say(message, duration = 2.4) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = duration;
  }

  function tick(dt) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0 && els.toast) {
        els.toast.classList.remove('show');
      }
    }
  }

  function sync(state) {
    const { player, money, wanted, missionsCompleted, mission } = state;

    if (els.money) els.money.textContent = '$ ' + money;
    if (els.status) els.status.textContent = player.inCar ? 'CONDUCIENDO' : 'A PIE';
    if (els.missionsCount) els.missionsCount.textContent = String(missionsCompleted);
    if (els.wanted) {
      const w = Math.max(0, Math.min(5, wanted));
      els.wanted.textContent = '★'.repeat(w) + '☆'.repeat(5 - w);
    }

    if (mission) {
      if (els.missionTitle) els.missionTitle.textContent = mission.title;
      if (els.missionHelp) {
        els.missionHelp.textContent = player.inCar ? mission.helpCar : mission.helpFoot;
      }
    }

    // Cambiar controles táctiles automáticamente según si está a pie o en auto
    CiudadCero.Input.setMode(player.inCar);
    CiudadCero.Input.setNearbyVehicle(!player.inCar && Boolean(state.nearestVehicle));

    if (els.vehicleHud) {
      if (player.inCar && player.vehicle) {
        els.vehicleHud.classList.remove('hidden');
        if (els.vehModel) els.vehModel.textContent = player.vehicle.name;
      } else {
        els.vehicleHud.classList.add('hidden');
      }
    }
  }

  function updateLiveTelemetry(actor, mission, vehicle) {
    if (mission && els.missionDist) {
      const meters = Math.round(Math.hypot(mission.x - actor.x, mission.y - actor.y) / 6);
      els.missionDist.textContent = meters + ' m';
    }
    if (vehicle && els.vehSpeed) {
      const kmh = Math.round(Math.abs(vehicle.speed) * 0.42);
      els.vehSpeed.textContent = String(kmh);
    }
  }

  return {
    init,
    say,
    tick,
    sync,
    updateLiveTelemetry
  };
})();
