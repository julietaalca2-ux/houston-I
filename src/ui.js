window.CiudadCero = window.CiudadCero || {};

CiudadCero.UI = (() => {
  let dom = {};
  let toastTimer = null;

  function init() {
    dom = {
      money: document.getElementById('money'),
      status: document.getElementById('status'),
      missionsCount: document.getElementById('missions-count'),
      wanted: document.getElementById('wanted'),
      missionTag: document.getElementById('mission-tag'),
      missionTimer: document.getElementById('mission-timer'),
      missionTitle: document.getElementById('mission-title'),
      missionHelp: document.getElementById('mission-help'),
      missionDist: document.getElementById('mission-dist'),
      policeHud: document.getElementById('police-hud'),
      policeStateLabel: document.getElementById('police-state-label'),
      policeUnits: document.getElementById('police-units'),
      escapeFill: document.getElementById('escape-fill'),
      policeStateHelp: document.getElementById('police-state-help'),
      vehicleHud: document.getElementById('vehicle-hud'),
      vehModel: document.getElementById('veh-model'),
      vehSpeed: document.getElementById('veh-speed'),
      vehHpBar: document.getElementById('veh-hp-bar'),
      toast: document.getElementById('toast'),
      btnAudio: document.getElementById('btn-audio'),
      btnTouchToggle: document.getElementById('btn-touch-toggle'),
      btnGarageTop: document.getElementById('btn-garage-top'),
      garageModal: document.getElementById('garage-modal'),
      garageModalTitle: document.getElementById('garage-modal-title'),
      garageCurrentBox: document.getElementById('garage-current-box'),
      garageCount: document.getElementById('garage-count'),
      garageList: document.getElementById('garage-list')
    };
  }

  function showToast(text, duration = 2600) {
    if (!dom.toast) return;
    dom.toast.textContent = text;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, duration);
  }

  function formatStars(wanted) {
    const w = Math.max(0, Math.min(5, wanted));
    return '★'.repeat(w) + '☆'.repeat(5 - w);
  }

  function updateHUD(data) {
    if (dom.money) dom.money.textContent = `$ ${data.money}`;
    if (dom.status) {
      dom.status.textContent = data.inCar ? `EN ${data.vehicleName}` : 'A PIE';
    }
    if (dom.missionsCount) dom.missionsCount.textContent = String(data.missionsCompleted);
    if (dom.wanted) {
      dom.wanted.textContent = formatStars(data.wanted);
      dom.wanted.classList.toggle('active-alert', data.wanted > 0);
    }

    if (data.mission && dom.missionTitle) {
      dom.missionTitle.textContent = data.mission.title;
      dom.missionHelp.textContent = data.inCar
        ? data.mission.helpCar
        : data.mission.helpFoot;
      if (dom.missionDist) {
        const meters = Math.round(data.missionDist / 10);
        dom.missionDist.textContent = `${meters} m`;
      }
      if (dom.missionTimer) {
        if (typeof data.missionTimeLeft === 'number' && data.missionTimeLeft > 0) {
          dom.missionTimer.classList.remove('hidden');
          dom.missionTimer.textContent = `${Math.ceil(data.missionTimeLeft)}s`;
        } else {
          dom.missionTimer.classList.add('hidden');
        }
      }
    }

    if (dom.policeHud && data.policeHUD) {
      const p = data.policeHUD;
      if (p.wanted > 0) {
        dom.policeHud.classList.remove('hidden');
        dom.policeHud.dataset.state = p.mode;
        if (dom.policeStateLabel) dom.policeStateLabel.textContent = p.label;
        if (dom.policeUnits) {
          dom.policeUnits.textContent = `${p.activeUnitsCount} UNIDAD${p.activeUnitsCount === 1 ? '' : 'ES'}`;
        }
        if (dom.escapeFill) {
          const pct = Math.round(Math.max(0, Math.min(1, p.escapeProgress)) * 100);
          dom.escapeFill.style.width = `${pct}%`;
        }
        if (dom.policeStateHelp) dom.policeStateHelp.textContent = p.help;
      } else {
        dom.policeHud.classList.add('hidden');
      }
    }

    if (dom.btnGarageTop) {
      dom.btnGarageTop.classList.toggle('garage-ready', Boolean(data.nearGarage));
    }

    if (dom.vehicleHud) {
      if (data.inCar) {
        dom.vehicleHud.classList.remove('hidden');
        if (dom.vehModel) dom.vehModel.textContent = data.vehicleName;
        if (dom.vehSpeed) dom.vehSpeed.textContent = String(Math.round(data.speedKmh));
        if (dom.vehHpBar) {
          const hpPct = Math.max(0, Math.min(100, Math.round(data.vehicleHpPct || 100)));
          dom.vehHpBar.style.width = `${hpPct}%`;
          dom.vehHpBar.style.background =
            hpPct > 55 ? '#d6f36a' : hpPct > 30 ? '#f5d94b' : '#e25845';
        }
      } else {
        dom.vehicleHud.classList.add('hidden');
      }
    }
  }

  function updateAudioButton(enabled) {
    if (!dom.btnAudio) return;
    dom.btnAudio.textContent = enabled ? 'SONIDO: ON' : 'SONIDO: OFF';
    dom.btnAudio.classList.toggle('active', enabled);
  }

  function updateTouchButton(label, mode) {
    if (!dom.btnTouchToggle) return;
    dom.btnTouchToggle.textContent = label;
    dom.btnTouchToggle.classList.toggle('active', mode === 'on');
  }

  function isGarageOpen() {
    return dom.garageModal && !dom.garageModal.classList.contains('hidden');
  }

  function closeGarageModal() {
    if (dom.garageModal) dom.garageModal.classList.add('hidden');
  }

  function renderGarageModal(ctxData, handlers) {
    if (!dom.garageModal) return;
    dom.garageModal.classList.remove('hidden');

    if (dom.garageModalTitle && ctxData.garage) {
      dom.garageModalTitle.textContent = ctxData.garage.name;
    }

    const rules = CiudadCero.Config.GARAGE_RULES;
    const activeVeh = ctxData.activeVehicle;

    if (dom.garageCurrentBox) {
      dom.garageCurrentBox.innerHTML = '';
      const info = document.createElement('div');
      info.className = 'garage-current-info';

      const actions = document.createElement('div');
      actions.className = 'garage-current-actions';

      if (activeVeh) {
        const hpPct = Math.round((activeVeh.hp / activeVeh.maxHp) * 100);
        const title = document.createElement('strong');
        title.textContent = `VEHÍCULO EN BAHÍA: ${activeVeh.name}`;
        const sub = document.createElement('small');
        sub.textContent = `Integridad: ${hpPct}% · Dinero disponible: $ ${ctxData.money}`;
        info.appendChild(title);
        info.appendChild(sub);

        const btnRepair = document.createElement('button');
        btnRepair.type = 'button';
        btnRepair.className = 'g-btn g-btn-amber';
        btnRepair.textContent = `REPARAR ($ ${rules.repairCost})`;
        btnRepair.disabled = activeVeh.hp >= activeVeh.maxHp - 1 || ctxData.money < rules.repairCost;
        btnRepair.addEventListener('click', () => handlers.onRepairActive && handlers.onRepairActive());

        const btnStore = document.createElement('button');
        btnStore.type = 'button';
        btnStore.className = 'g-btn';
        btnStore.textContent = 'GUARDAR EN GARAJE';
        btnStore.addEventListener('click', () => handlers.onStoreActive && handlers.onStoreActive());

        actions.appendChild(btnRepair);
        actions.appendChild(btnStore);
      } else {
        const title = document.createElement('strong');
        title.textContent = 'BAHÍA DE TALLER LIBRE';
        const sub = document.createElement('small');
        sub.textContent = `Entra conduciendo un vehículo para guardarlo o selecciona uno abajo · Dinero: $ ${ctxData.money}`;
        info.appendChild(title);
        info.appendChild(sub);
      }

      dom.garageCurrentBox.appendChild(info);
      dom.garageCurrentBox.appendChild(actions);
    }

    const slots = ctxData.slots || [];
    if (dom.garageCount) {
      dom.garageCount.textContent = `${slots.length}/${ctxData.maxSlots}`;
    }

    if (dom.garageList) {
      dom.garageList.innerHTML = '';
      if (slots.length === 0) {
        const empty = document.createElement('small');
        empty.textContent = 'Aún no tienes vehículos guardados.';
        dom.garageList.appendChild(empty);
        return;
      }

      slots.forEach((slot) => {
        const row = document.createElement('div');
        row.className = 'garage-slot';

        const left = document.createElement('div');
        left.className = 'garage-slot-left';

        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = slot.color;

        const meta = document.createElement('div');
        meta.className = 'garage-slot-meta';
        const hpPct = Math.round((slot.hp / slot.maxHp) * 100);
        const nameEl = document.createElement('strong');
        nameEl.textContent = slot.name;
        const subEl = document.createElement('small');
        subEl.textContent = `Estado: ${hpPct}% · ${slot.stored ? 'Guardado en depósito' : 'En circulación en la ciudad'}`;

        meta.appendChild(nameEl);
        meta.appendChild(subEl);
        left.appendChild(swatch);
        left.appendChild(meta);

        const btns = document.createElement('div');
        btns.className = 'garage-slot-btns';

        if (hpPct < 100) {
          const bRep = document.createElement('button');
          bRep.type = 'button';
          bRep.className = 'g-btn g-btn-amber';
          bRep.textContent = `REPARAR ($${rules.repairCost})`;
          bRep.disabled = ctxData.money < rules.repairCost;
          bRep.addEventListener('click', () => handlers.onRepairSlot && handlers.onRepairSlot(slot.slotId));
          btns.appendChild(bRep);
        }

        if (slot.stored) {
          const bSel = document.createElement('button');
          bSel.type = 'button';
          bSel.className = 'g-btn';
          bSel.textContent = 'SELECCIONAR';
          bSel.addEventListener('click', () => handlers.onSelectSlot && handlers.onSelectSlot(slot.slotId));
          btns.appendChild(bSel);
        } else {
          const bRec = document.createElement('button');
          bRec.type = 'button';
          bRec.className = 'g-btn';
          bRec.textContent = `RECUPERAR ($${rules.recoverCost})`;
          bRec.disabled = ctxData.money < rules.recoverCost;
          bRec.addEventListener('click', () => handlers.onRecoverSlot && handlers.onRecoverSlot(slot.slotId));
          btns.appendChild(bRec);
        }

        row.appendChild(left);
        row.appendChild(btns);
        dom.garageList.appendChild(row);
      });
    }
  }

  return {
    init,
    showToast,
    updateHUD,
    updateAudioButton,
    updateTouchButton,
    isGarageOpen,
    closeGarageModal,
    renderGarageModal
  };
})();
