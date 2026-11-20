window.CiudadCero = window.CiudadCero || {};

CiudadCero.UI = (() => {
  let dom = {};
  let toastTimer = null;
  let rewardTimer = null;
  let currentStoryTab = 'chapters';

  function init() {
    dom = {
      chapterBadge: document.getElementById('chapter-badge'),
      money: document.getElementById('money'),
      status: document.getElementById('status'),
      missionsCount: document.getElementById('missions-count'),
      wanted: document.getElementById('wanted'),
      missionTag: document.getElementById('mission-tag'),
      missionTimer: document.getElementById('mission-timer'),
      missionTitle: document.getElementById('mission-title'),
      missionHelp: document.getElementById('mission-help'),
      missionDist: document.getElementById('mission-dist'),
      targetHpWrap: document.getElementById('target-hp-wrap'),
      targetHpBar: document.getElementById('target-hp-bar'),
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
      rewardBanner: document.getElementById('reward-banner'),
      rewardTitle: document.getElementById('reward-title'),
      rewardAmount: document.getElementById('reward-amount'),
      rewardUnlock: document.getElementById('reward-unlock'),
      dialogueBox: document.getElementById('dialogue-box'),
      dialogueAvatar: document.getElementById('dialogue-avatar'),
      dialogueName: document.getElementById('dialogue-name'),
      dialogueRole: document.getElementById('dialogue-role'),
      dialogueText: document.getElementById('dialogue-text'),
      dialogueCounter: document.getElementById('dialogue-counter'),
      btnDialogueNext: document.getElementById('btn-dialogue-next'),
      btnAudio: document.getElementById('btn-audio'),
      btnTouchToggle: document.getElementById('btn-touch-toggle'),
      btnGarageTop: document.getElementById('btn-garage-top'),
      btnStoryTop: document.getElementById('btn-story-top'),
      garageModal: document.getElementById('garage-modal'),
      garageModalTitle: document.getElementById('garage-modal-title'),
      garageCurrentBox: document.getElementById('garage-current-box'),
      garageUpgradesBox: document.getElementById('garage-upgrades-box'),
      garageCount: document.getElementById('garage-count'),
      garageList: document.getElementById('garage-list'),
      garageCatalogList: document.getElementById('garage-catalog-list'),
      storyModal: document.getElementById('story-modal'),
      storyChapterTitle: document.getElementById('story-chapter-title'),
      storyBody: document.getElementById('story-body'),
      confirmModal: document.getElementById('confirm-modal')
    };

    document.querySelectorAll('[data-story-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentStoryTab = btn.dataset.storyTab || 'chapters';
        document.querySelectorAll('[data-story-tab]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        if (lastStoryArgs) {
          renderStoryModal(lastStoryArgs.data, lastStoryArgs.handlers);
        }
      });
    });
  }

  let lastStoryArgs = null;

  function showToast(text, duration = 2600) {
    if (!dom.toast) return;
    dom.toast.textContent = text;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, duration);
  }

  function showRewardBanner(info) {
    if (!dom.rewardBanner) return;
    if (dom.rewardTitle) {
      dom.rewardTitle.textContent = info.campaignFinished
        ? `¡CAMPAÑA COMPLETADA! · ${info.title}`
        : `MISIÓN COMPLETADA · ${info.title}`;
    }
    if (dom.rewardAmount) {
      dom.rewardAmount.textContent = `+$ ${info.reward}`;
    }
    if (dom.rewardUnlock) {
      if (info.unlockedName) {
        dom.rewardUnlock.textContent = `VEHÍCULO DESBLOQUEADO: ${info.unlockedName}`;
        dom.rewardUnlock.classList.remove('hidden');
      } else {
        dom.rewardUnlock.classList.add('hidden');
      }
    }
    dom.rewardBanner.classList.remove('hidden');
    clearTimeout(rewardTimer);
    rewardTimer = setTimeout(() => {
      dom.rewardBanner.classList.add('hidden');
    }, 4200);
  }

  function formatStars(wanted) {
    const w = Math.max(0, Math.min(5, wanted));
    return '★'.repeat(w) + '☆'.repeat(5 - w);
  }

  function updateHUD(data) {
    if (dom.chapterBadge && data.chapterLabel) {
      dom.chapterBadge.textContent = data.chapterLabel;
    }
    if (dom.money) dom.money.textContent = `$ ${data.money}`;
    if (dom.status) {
      dom.status.textContent = data.inCar ? `EN ${data.vehicleName}` : 'A PIE';
    }
    if (dom.missionsCount) dom.missionsCount.textContent = String(data.missionsCompleted);
    if (dom.wanted) {
      dom.wanted.textContent = formatStars(data.wanted);
      dom.wanted.classList.toggle('active-alert', data.wanted > 0);
    }

    if (data.missionInfo && dom.missionTitle) {
      const m = data.missionInfo;
      if (dom.missionTag) dom.missionTag.textContent = m.tag || 'OBJETIVO';
      dom.missionTitle.textContent = m.title;
      dom.missionHelp.textContent = m.help;

      if (dom.missionDist) {
        if (m.hasTarget) {
          const meters = Math.round(data.missionDist / 10);
          dom.missionDist.textContent = `${meters} m`;
          dom.missionDist.classList.remove('hidden');
        } else {
          dom.missionDist.classList.add('hidden');
        }
      }

      if (dom.missionTimer) {
        if (typeof m.timeLeft === 'number' && m.timeLeft > 0) {
          dom.missionTimer.classList.remove('hidden');
          dom.missionTimer.textContent = `${Math.ceil(m.timeLeft)}s`;
        } else {
          dom.missionTimer.classList.add('hidden');
        }
      }

      if (dom.targetHpWrap && dom.targetHpBar) {
        if (m.isChase && m.targetMaxHp > 0) {
          dom.targetHpWrap.classList.remove('hidden');
          const pct = Math.max(0, Math.min(100, Math.round((m.targetHp / m.targetMaxHp) * 100)));
          dom.targetHpBar.style.width = `${pct}%`;
        } else {
          dom.targetHpWrap.classList.add('hidden');
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

  function renderDialogue(line) {
    if (!dom.dialogueBox) return;
    if (!line) {
      dom.dialogueBox.classList.add('hidden');
      return;
    }
    dom.dialogueBox.classList.remove('hidden');
    if (dom.dialogueAvatar) {
      dom.dialogueAvatar.textContent = line.speakerName.charAt(0).toUpperCase();
      dom.dialogueAvatar.style.borderColor = line.speakerColor;
      dom.dialogueAvatar.style.color = line.speakerColor;
    }
    if (dom.dialogueName) {
      dom.dialogueName.textContent = line.speakerName;
      dom.dialogueName.style.color = line.speakerColor;
    }
    if (dom.dialogueRole) {
      dom.dialogueRole.textContent = line.speakerRole;
    }
    if (dom.dialogueText) {
      dom.dialogueText.textContent = line.text;
    }
    if (dom.dialogueCounter) {
      dom.dialogueCounter.textContent = `${line.index + 1}/${line.total}`;
    }
    if (dom.btnDialogueNext) {
      dom.btnDialogueNext.textContent =
        line.index + 1 >= line.total ? 'ENTENDIDO ✓' : 'CONTINUAR ▸';
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

  function isStoryOpen() {
    return dom.storyModal && !dom.storyModal.classList.contains('hidden');
  }

  function closeStoryModal() {
    if (dom.storyModal) dom.storyModal.classList.add('hidden');
  }

  function isConfirmOpen() {
    return dom.confirmModal && !dom.confirmModal.classList.contains('hidden');
  }

  function openConfirmModal() {
    if (dom.confirmModal) dom.confirmModal.classList.remove('hidden');
  }

  function closeConfirmModal() {
    if (dom.confirmModal) dom.confirmModal.classList.add('hidden');
  }

  function renderGarageModal(ctxData, handlers) {
    if (!dom.garageModal) return;
    dom.garageModal.classList.remove('hidden');

    if (dom.garageModalTitle && ctxData.garage) {
      dom.garageModalTitle.textContent = ctxData.garage.name;
    }

    const rules = CiudadCero.Config.GARAGE_RULES;
    const upgs = CiudadCero.Config.GARAGE_UPGRADES;
    const activeVeh = ctxData.activeVehicle;

    if (dom.garageCurrentBox) {
      dom.garageCurrentBox.innerHTML = '';
      const info = document.createElement('div');
      info.className = 'garage-current-info';

      const actions = document.createElement('div');
      actions.className = 'garage-current-actions';

      if (activeVeh) {
        const hpPct = Math.round((activeVeh.hp / activeVeh.maxHp) * 100);
        const badges = [];
        if (activeVeh.armorUpgraded) badges.push('BLINDADO');
        if (activeVeh.engineUpgraded) badges.push('TURBO');
        const badgeText = badges.length ? ` [${badges.join(' · ')}]` : '';

        const title = document.createElement('strong');
        title.textContent = `EN BAHÍA: ${activeVeh.name}${badgeText}`;
        const sub = document.createElement('small');
        sub.textContent = `Integridad: ${hpPct}% (${Math.round(activeVeh.hp)}/${Math.round(activeVeh.maxHp)} HP) · Saldo: $ ${ctxData.money}`;
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
        btnStore.textContent = 'GUARDAR EN FLOTA';
        btnStore.addEventListener('click', () => handlers.onStoreActive && handlers.onStoreActive());

        actions.appendChild(btnRepair);
        actions.appendChild(btnStore);
      } else {
        const title = document.createElement('strong');
        title.textContent = 'BAHÍA DE TALLER LIBRE';
        const sub = document.createElement('small');
        sub.textContent = `Entra conduciendo un vehículo para guardarlo o adquiere uno abajo · Saldo: $ ${ctxData.money}`;
        info.appendChild(title);
        info.appendChild(sub);
      }

      dom.garageCurrentBox.appendChild(info);
      dom.garageCurrentBox.appendChild(actions);
    }

    if (dom.garageUpgradesBox) {
      dom.garageUpgradesBox.innerHTML = '';
      if (activeVeh) {
        const armorBtn = document.createElement('button');
        armorBtn.type = 'button';
        armorBtn.className = 'g-btn';
        armorBtn.textContent = activeVeh.armorUpgraded
          ? '✓ BLINDAJE INSTALADO'
          : `BLINDAJE +40 HP ($ ${upgs.armor.cost})`;
        armorBtn.disabled = activeVeh.armorUpgraded || ctxData.money < upgs.armor.cost;
        armorBtn.addEventListener('click', () => handlers.onUpgradeActive && handlers.onUpgradeActive('armor'));

        const turboBtn = document.createElement('button');
        turboBtn.type = 'button';
        turboBtn.className = 'g-btn';
        turboBtn.textContent = activeVeh.engineUpgraded
          ? '✓ TURBO INSTALADO'
          : `TURBO +12% VEL ($ ${upgs.turbo.cost})`;
        turboBtn.disabled = activeVeh.engineUpgraded || ctxData.money < upgs.turbo.cost;
        turboBtn.addEventListener('click', () => handlers.onUpgradeActive && handlers.onUpgradeActive('turbo'));

        dom.garageUpgradesBox.appendChild(armorBtn);
        dom.garageUpgradesBox.appendChild(turboBtn);
      }

      if (ctxData.wanted > 0) {
        const bribeBtn = document.createElement('button');
        bribeBtn.type = 'button';
        bribeBtn.className = 'g-btn g-btn-amber';
        bribeBtn.textContent = `CAMBIAR MATRÍCULA -2★ ($ ${upgs.bribe.cost})`;
        bribeBtn.disabled = ctxData.money < upgs.bribe.cost;
        bribeBtn.addEventListener('click', () => handlers.onBribePolice && handlers.onBribePolice());
        dom.garageUpgradesBox.appendChild(bribeBtn);
      }
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
      } else {
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

    if (dom.garageCatalogList) {
      dom.garageCatalogList.innerHTML = '';
      const catalog = CiudadCero.Config.VEHICLE_CATALOG || [];
      catalog.forEach((item) => {
        const spec = CiudadCero.Config.VEHICLE_TYPES[item.typeId];
        if (!spec) return;
        const unlocked = ctxData.unlockedTypes.includes(item.typeId);

        const row = document.createElement('div');
        row.className = `garage-slot ${unlocked ? '' : 'locked-slot'}`;

        const left = document.createElement('div');
        left.className = 'garage-slot-left';

        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = item.color;

        const meta = document.createElement('div');
        meta.className = 'garage-slot-meta';
        const nameEl = document.createElement('strong');
        nameEl.textContent = unlocked ? spec.name : `🔒 ${spec.name}`;
        const subEl = document.createElement('small');
        subEl.textContent = unlocked ? item.desc : item.unlockHint;

        meta.appendChild(nameEl);
        meta.appendChild(subEl);
        left.appendChild(swatch);
        left.appendChild(meta);

        const btns = document.createElement('div');
        btns.className = 'garage-slot-btns';

        const buyBtn = document.createElement('button');
        buyBtn.type = 'button';
        buyBtn.className = 'g-btn';
        buyBtn.textContent = unlocked ? `COMPRAR ($ ${item.price})` : 'BLOQUEADO';
        buyBtn.disabled = !unlocked || ctxData.money < item.price || slots.length >= ctxData.maxSlots;
        buyBtn.addEventListener('click', () => handlers.onBuyCatalog && handlers.onBuyCatalog(item.typeId));
        btns.appendChild(buyBtn);

        row.appendChild(left);
        row.appendChild(btns);
        dom.garageCatalogList.appendChild(row);
      });
    }
  }

  function renderStoryModal(data, handlers) {
    if (!dom.storyModal) return;
    lastStoryArgs = { data, handlers };
    dom.storyModal.classList.remove('hidden');

    if (dom.storyChapterTitle && data.summary) {
      dom.storyChapterTitle.textContent = data.summary.campaignFinished
        ? 'CAMPAÑA PRINCIPAL COMPLETADA · MODO LIBRE'
        : `${data.summary.chapterNumber}: ${data.summary.chapterTitle}`;
    }

    if (!dom.storyBody) return;
    dom.storyBody.innerHTML = '';

    if (currentStoryTab === 'chapters') {
      const chapters = CiudadCero.Config.CHAPTERS || [];
      chapters.forEach((ch) => {
        const card = document.createElement('div');
        card.className = 'story-chapter-card';

        const head = document.createElement('div');
        head.className = 'story-chapter-head';
        head.innerHTML = `<div><span class="story-badge">${ch.number}</span><strong>${ch.title}</strong></div><small>${ch.subtitle}</small>`;
        card.appendChild(head);

        const desc = document.createElement('p');
        desc.className = 'story-chapter-desc';
        desc.textContent = ch.summary;
        card.appendChild(desc);

        ch.missions.forEach((m) => {
          const isDone = data.completedMainIds.includes(m.id);
          const isCurrent = data.activeMission && !data.activeMission.isSide && data.activeMission.id === m.id;

          const mRow = document.createElement('div');
          mRow.className = `story-mission-row ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`;

          const statusTxt = isDone ? 'COMPLETADA ✓' : isCurrent ? 'EN CURSO ●' : 'PENDIENTE';
          mRow.innerHTML = `
            <div>
              <strong>${m.code} · ${m.title}</strong>
              <small>${m.helpCar}</small>
            </div>
            <div class="story-mission-right">
              <span class="story-reward">$ ${m.reward}</span>
              <span class="story-status">${statusTxt}</span>
            </div>
          `;
          card.appendChild(mRow);
        });

        dom.storyBody.appendChild(card);
      });
    } else if (currentStoryTab === 'characters') {
      const p = CiudadCero.Config.PROTAGONIST;
      const pCard = document.createElement('div');
      pCard.className = 'char-card protagonist-card';
      pCard.innerHTML = `
        <div class="char-head">
          <span class="char-avatar" style="border-color:${p.color};color:${p.color}">M</span>
          <div>
            <strong>${p.name}</strong>
            <small>${p.role} · ${p.age} · ${p.origin}</small>
          </div>
        </div>
        <p><b>Personalidad:</b> ${p.personality}</p>
        <p><b>Pasado:</b> ${p.backstory}</p>
        <p><b>Motivación:</b> ${p.motivation}</p>
      `;
      dom.storyBody.appendChild(pCard);

      const chars = CiudadCero.Config.CHARACTERS || {};
      Object.keys(chars).forEach((key) => {
        const c = chars[key];
        const cCard = document.createElement('div');
        cCard.className = 'char-card';
        cCard.innerHTML = `
          <div class="char-head">
            <span class="char-avatar" style="border-color:${c.color};color:${c.color}">${c.name.charAt(0)}</span>
            <div>
              <strong>${c.name}</strong>
              <small>${c.role}</small>
            </div>
          </div>
          <p><b>Personalidad:</b> ${c.personality}</p>
          <p>${c.bio}</p>
        `;
        dom.storyBody.appendChild(cCard);
      });
    } else if (currentStoryTab === 'side') {
      const sides = CiudadCero.Config.SIDE_MISSIONS || [];
      sides.forEach((s) => {
        const isDone = data.completedSideIds.includes(s.id);
        const isActive = data.activeMission && data.activeMission.isSide && data.activeMission.id === s.id;

        const row = document.createElement('div');
        row.className = `story-mission-row ${isDone ? 'done' : ''} ${isActive ? 'current' : ''}`;

        const left = document.createElement('div');
        left.innerHTML = `
          <strong>${s.code} · ${s.title} ${isDone ? '✓' : ''}</strong>
          <small>${s.desc}</small>
        `;

        const right = document.createElement('div');
        right.className = 'story-mission-right';

        const rew = document.createElement('span');
        rew.className = 'story-reward';
        rew.textContent = `$ ${s.reward}`;
        right.appendChild(rew);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isActive ? 'g-btn g-btn-amber' : 'g-btn';
        btn.textContent = isActive ? 'ABANDONAR' : 'ACTIVAR';
        btn.addEventListener('click', () => {
          if (isActive) {
            handlers.onAbandonSide && handlers.onAbandonSide();
          } else {
            handlers.onStartSide && handlers.onStartSide(s.id);
          }
        });
        right.appendChild(btn);

        row.appendChild(left);
        row.appendChild(right);
        dom.storyBody.appendChild(row);
      });
    }
  }

  return {
    init,
    showToast,
    showRewardBanner,
    updateHUD,
    renderDialogue,
    updateAudioButton,
    updateTouchButton,
    isGarageOpen,
    closeGarageModal,
    renderGarageModal,
    isStoryOpen,
    closeStoryModal,
    renderStoryModal,
    isConfirmOpen,
    openConfirmModal,
    closeConfirmModal
  };
})();
