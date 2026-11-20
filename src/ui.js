window.CiudadCero = window.CiudadCero || {};

CiudadCero.UI = (() => {
  let dom = {};
  let toastTimer = null;
  let rewardTimer = null;
  let currentStoryTab = 'chapters';
  let currentMenuSection = 'hub';
  let lastStoryArgs = null;
  let lastMenuArgs = null;
  let lastMapArgs = null;

  const mapView = {
    zoom: 1,
    panX: 0,
    panY: 0,
    lastTransform: null
  };

  function init() {
    dom = {
      money: document.getElementById('money'),
      wanted: document.getElementById('wanted'),
      missionTag: document.getElementById('mission-tag'),
      missionTimer: document.getElementById('mission-timer'),
      missionTitle: document.getElementById('mission-title'),
      missionHelp: document.getElementById('mission-help'),
      missionDist: document.getElementById('mission-dist'),
      targetHpWrap: document.getElementById('target-hp-wrap'),
      targetHpBar: document.getElementById('target-hp-bar'),
      districtPill: document.getElementById('district-pill'),
      districtDot: document.getElementById('district-dot'),
      districtName: document.getElementById('district-name'),
      districtAvenue: document.getElementById('district-avenue'),
      btnTalkQuick: document.getElementById('btn-talk-quick'),
      btnGarageQuick: document.getElementById('btn-garage-quick'),
      btnStoreQuick: document.getElementById('btn-store-quick'),
      storeModal: document.getElementById('store-modal'),
      storeModalTitle: document.getElementById('store-modal-title'),
      storeModalTag: document.getElementById('store-modal-tag'),
      storeContent: document.getElementById('store-content'),
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
      menuModal: document.getElementById('menu-modal'),
      menuModalTag: document.getElementById('menu-modal-tag'),
      menuModalTitle: document.getElementById('menu-modal-title'),
      btnMenuBack: document.getElementById('btn-menu-back'),
      menuContent: document.getElementById('menu-content'),
      mapModal: document.getElementById('map-modal'),
      fullMapCanvas: document.getElementById('full-map-canvas'),
      mapDistrictsStrip: document.getElementById('map-districts-strip'),
      mapLandmarksStrip: document.getElementById('map-landmarks-strip'),
      mapGpsStatus: document.getElementById('map-gps-status'),
      btnMapClearGps: document.getElementById('btn-map-clear-gps'),
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

    if (dom.btnMenuBack) {
      dom.btnMenuBack.addEventListener('click', () => {
        currentMenuSection = 'hub';
        if (lastMenuArgs) {
          renderMenuModal(lastMenuArgs.data, lastMenuArgs.handlers);
        }
      });
    }

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

    setupFullMapInteractions();
  }

  function setupFullMapInteractions() {
    const c = dom.fullMapCanvas;
    if (!c) return;

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let origPanX = 0;
    let origPanY = 0;

    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      origPanX = mapView.panX;
      origPanY = mapView.panY;
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
    });

    c.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (moved) {
        mapView.panX = origPanX + dx;
        mapView.panY = origPanY + dy;
        redrawFullMap();
      }
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      if (!moved && mapView.lastTransform && lastMapArgs && lastMapArgs.handlers) {
        const rect = c.getBoundingClientRect();
        const scaleX = c.width / rect.width;
        const scaleY = c.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const tr = mapView.lastTransform;
        const wx = (cx - tr.offsetX) / tr.scale;
        const wy = (cy - tr.offsetY) / tr.scale;
        if (wx >= 0 && wx <= tr.worldW && wy >= 0 && wy <= tr.worldH) {
          const distObj = CiudadCero.World.getDistrictAt(wx, wy);
          if (lastMapArgs.handlers.onSetWaypoint) {
            lastMapArgs.handlers.onSetWaypoint({
              x: Math.round(wx),
              y: Math.round(wy),
              label: distObj.shortName
            });
          }
          redrawFullMap();
        }
      }
    };

    c.addEventListener('pointerup', endDrag);
    c.addEventListener('pointercancel', endDrag);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomFullMap(e.deltaY < 0 ? 0.22 : -0.22);
    }, { passive: false });
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
    if (dom.money) dom.money.textContent = `$ ${data.money}`;
    if (dom.wanted) {
      dom.wanted.textContent = formatStars(data.wanted);
      dom.wanted.classList.toggle('active-alert', data.wanted > 0);
    }

    if (dom.districtPill) {
      dom.districtPill.classList.toggle('hidden', data.showDistrictBadge === false);
      if (data.district) {
        if (dom.districtDot) dom.districtDot.style.background = data.district.color || '#d6f36a';
        if (dom.districtName) dom.districtName.textContent = data.district.shortName || data.district.name;
        if (dom.districtAvenue) dom.districtAvenue.textContent = data.district.avenueLabel || '';
      }
    }

    if (dom.btnGarageQuick) {
      dom.btnGarageQuick.classList.toggle('hidden', !data.nearGarage);
    }
    if (dom.btnTalkQuick) {
      dom.btnTalkQuick.classList.toggle('hidden', !data.nearNPC);
    }
    if (dom.btnStoreQuick) {
      dom.btnStoreQuick.classList.toggle('hidden', !data.nearStore);
      if (data.nearStore) dom.btnStoreQuick.textContent = data.nearStore.type === 'weapons' ? '🔫 ARMERÍA' : '🏪 COMERCIO';
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
      if (CiudadCero.Characters && CiudadCero.Characters.getPortraitSVG) {
        dom.dialogueAvatar.innerHTML = CiudadCero.Characters.getPortraitSVG(line.speakerId, 44);
      } else {
        dom.dialogueAvatar.textContent = line.speakerName.charAt(0).toUpperCase();
      }
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

  /* ============================================================================
     SECTIONED IN-GAME MENU
     ============================================================================ */
  function isMenuOpen() {
    return dom.menuModal && !dom.menuModal.classList.contains('hidden');
  }

  function openMenuModal(section, data, handlers) {
    currentMenuSection = section || 'hub';
    renderMenuModal(data, handlers);
  }

  function closeMenuModal() {
    if (dom.menuModal) dom.menuModal.classList.add('hidden');
  }

  function makeToggleRow(title, desc, isOn, onLabel, offLabel, onClick) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `<div class="setting-info"><strong>${title}</strong><small>${desc}</small></div>`;
    const ctrl = document.createElement('div');
    ctrl.className = 'setting-ctrl';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isOn ? 'g-btn' : 'hud-btn';
    btn.textContent = isOn ? onLabel : offLabel;
    btn.addEventListener('click', onClick);
    ctrl.appendChild(btn);
    row.appendChild(ctrl);
    return row;
  }

  function makeChoiceRow(title, desc, options, activeVal, onSelect) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `<div class="setting-info"><strong>${title}</strong><small>${desc}</small></div>`;
    const ctrl = document.createElement('div');
    ctrl.className = 'setting-ctrl';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = opt.value === activeVal ? 'g-btn' : 'hud-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => onSelect(opt.value));
      ctrl.appendChild(btn);
    });
    row.appendChild(ctrl);
    return row;
  }

  function makeSliderRow(title, desc, min, max, value, formatFn, onChange) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `<div class="setting-info"><strong>${title}</strong><small>${desc}</small></div>`;
    const ctrl = document.createElement('div');
    ctrl.className = 'setting-ctrl';

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'setting-slider';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);

    const valSpan = document.createElement('span');
    valSpan.className = 'setting-val';
    valSpan.textContent = formatFn(value);

    input.addEventListener('input', () => {
      const num = Number(input.value);
      valSpan.textContent = formatFn(num);
      onChange(num);
    });

    ctrl.appendChild(input);
    ctrl.appendChild(valSpan);
    row.appendChild(ctrl);
    return row;
  }

  function renderMenuModal(data, handlers) {
    if (!dom.menuModal || !dom.menuContent) return;
    lastMenuArgs = { data, handlers };
    dom.menuModal.classList.remove('hidden');

    const isHub = currentMenuSection === 'hub';
    if (dom.btnMenuBack) {
      dom.btnMenuBack.classList.toggle('hidden', isHub);
    }

    const sectionTitles = {
      hub: { tag: 'CIUDAD CERO · v0.8.0 · COMERCIOS Y GPS', title: 'MENÚ DEL JUEGO' },
      partida: { tag: 'SECCIÓN · GESTIÓN DE PROGRESO', title: 'PARTIDA Y GUARDADO' },
      sonido: { tag: 'SECCIÓN · AUDIO DEL JUEGO', title: 'SONIDO Y MÚSICA' },
      controles: { tag: 'SECCIÓN · ERGONOMÍA MÓVIL Y TÁCTIL', title: 'CONTROLES TÁCTILES' },
      mapa: { tag: 'SECCIÓN · CIUDAD EXPANDIDA (6 BARRIOS)', title: 'MAPA Y UBICACIONES' },
      configuracion: { tag: 'SECCIÓN · PREFERENCIAS DEL SISTEMA', title: 'CONFIGURACIÓN GENERAL' }
    };

    const meta = sectionTitles[currentMenuSection] || sectionTitles.hub;
    if (dom.menuModalTag) dom.menuModalTag.textContent = meta.tag;
    if (dom.menuModalTitle) dom.menuModalTitle.textContent = meta.title;

    dom.menuContent.innerHTML = '';

    // 1. HUB VIEW
    if (currentMenuSection === 'hub') {
      const grid = document.createElement('div');
      grid.className = 'menu-hub-grid';

      const sections = [
        { id: 'partida', icon: '💾', title: 'PARTIDA', desc: 'Guardar, cargar, ver progreso y reiniciar partida.' },
        { id: 'sonido', icon: '🔊', title: 'SONIDO', desc: 'Activar sonido, volumen, música y efectos.' },
        { id: 'controles', icon: '🎮', title: 'CONTROLES TÁCTILES', desc: 'Joystick, sensibilidad y disposición de botones.' },
        { id: 'mapa', icon: '🗺️', title: 'MAPA', desc: 'Abrir mapa ampliado y consultar los 6 barrios.' },
        { id: 'configuracion', icon: '⚙️', title: 'CONFIGURACIÓN', desc: 'Opciones generales, minimapa y rendimiento.' },
        { id: 'historia_shortcut', icon: '📖', title: 'HISTORIA Y MISIONES', desc: 'Capítulos, personajes y encargos secundarios.' }
      ];

      sections.forEach((sec) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'menu-section-btn';
        btn.innerHTML = `
          <span class="menu-sec-icon">${sec.icon}</span>
          <span class="menu-sec-text">
            <strong>${sec.title}</strong>
            <small>${sec.desc}</small>
          </span>
        `;
        btn.addEventListener('click', () => {
          if (sec.id === 'historia_shortcut') {
            closeMenuModal();
            if (handlers.onOpenStory) handlers.onOpenStory();
          } else {
            currentMenuSection = sec.id;
            renderMenuModal(data, handlers);
          }
        });
        grid.appendChild(btn);
      });

      dom.menuContent.appendChild(grid);

      const resumeBar = document.createElement('div');
      resumeBar.className = 'menu-resume-bar';
      resumeBar.innerHTML = `<small>${data.summary.chapterNumber} · ${data.district.name} · Saldo: $ ${data.money}</small>`;
      const resumeBtn = document.createElement('button');
      resumeBtn.type = 'button';
      resumeBtn.className = 'g-btn';
      resumeBtn.textContent = '▶ VOLVER AL JUEGO';
      resumeBtn.addEventListener('click', () => handlers.onCloseMenu && handlers.onCloseMenu());
      resumeBar.appendChild(resumeBtn);
      dom.menuContent.appendChild(resumeBar);
      return;
    }

    // 2. PARTIDA SECTION
    if (currentMenuSection === 'partida') {
      const progGrid = document.createElement('div');
      progGrid.className = 'progress-grid';

      const items = [
        { label: 'CAMPAÑA ACTUAL', val: `${data.summary.chapterNumber}: ${data.summary.chapterTitle}` },
        { label: 'MISIONES PRINCIPALES', val: `${data.summary.completedMainCount} / ${data.summary.totalMain} COMPLETADAS` },
        { label: 'MISIONES SECUNDARIAS', val: `${data.summary.completedSideCount} / ${(CiudadCero.Config.SIDE_MISSIONS || []).length} COMPLETADAS` },
        { label: 'DINERO EN CUENTA', val: `$ ${data.money}` },
        { label: 'VEHÍCULOS EN FLOTA', val: `${data.fleetCount} / ${data.maxSlots} GUARDADOS` },
        { label: 'UBICACIÓN ACTUAL', val: data.district.name.toUpperCase() }
      ];

      items.forEach((it) => {
        const box = document.createElement('div');
        box.className = 'prog-box';
        box.innerHTML = `<small>${it.label}</small><strong>${it.val}</strong>`;
        progGrid.appendChild(box);
      });

      dom.menuContent.appendChild(progGrid);

      const panel = document.createElement('div');
      panel.className = 'setting-panel';

      const statusLine = document.createElement('small');
      statusLine.style.color = '#a9b8a7';
      statusLine.textContent = data.hasSavedGame
        ? 'Estado de almacenamiento: Partida guardada detectada en este dispositivo.'
        : 'Estado de almacenamiento: Aún no has guardado manualmente en esta sesión.';
      panel.appendChild(statusLine);

      const btnGrid = document.createElement('div');
      btnGrid.className = 'action-btn-grid';

      const btnSave = document.createElement('button');
      btnSave.type = 'button';
      btnSave.className = 'g-btn';
      btnSave.textContent = '💾 GUARDAR PARTIDA';
      btnSave.addEventListener('click', () => {
        if (handlers.onManualSave) handlers.onManualSave();
        renderMenuModal(Object.assign({}, data, { hasSavedGame: true }), handlers);
      });

      const btnLoad = document.createElement('button');
      btnLoad.type = 'button';
      btnLoad.className = 'g-btn g-btn-sky';
      btnLoad.textContent = '📂 CARGAR PARTIDA';
      btnLoad.disabled = !data.hasSavedGame;
      btnLoad.addEventListener('click', () => {
        if (handlers.onManualLoad) handlers.onManualLoad();
      });

      const btnReset = document.createElement('button');
      btnReset.type = 'button';
      btnReset.className = 'g-btn g-btn-danger';
      btnReset.textContent = '🔄 REINICIAR PARTIDA';
      btnReset.addEventListener('click', () => {
        if (handlers.onRequestReset) handlers.onRequestReset();
      });

      const btnBack = document.createElement('button');
      btnBack.type = 'button';
      btnBack.className = 'hud-btn';
      btnBack.textContent = '▶ VOLVER AL JUEGO';
      btnBack.addEventListener('click', () => {
        if (handlers.onCloseMenu) handlers.onCloseMenu();
      });

      btnGrid.appendChild(btnSave);
      btnGrid.appendChild(btnLoad);
      btnGrid.appendChild(btnReset);
      btnGrid.appendChild(btnBack);
      panel.appendChild(btnGrid);
      dom.menuContent.appendChild(panel);
      return;
    }

    // 3. SONIDO SECTION
    if (currentMenuSection === 'sonido') {
      const aud = data.settings.audio;
      const panel = document.createElement('div');
      panel.className = 'setting-panel';

      panel.appendChild(
        makeToggleRow(
          'Sonido General',
          'Activa o silencia todo el audio de Ciudad Cero.',
          aud.enabled,
          'ACTIVADO',
          'SILENCIADO',
          () => {
            handlers.onUpdateAudio({ enabled: !aud.enabled });
          }
        )
      );

      panel.appendChild(
        makeSliderRow(
          'Control de Volumen',
          'Ajusta el nivel general de volumen (0% a 100%).',
          0,
          100,
          Math.round((aud.masterVolume ?? 0.85) * 100),
          (v) => `${v}%`,
          (v) => {
            handlers.onUpdateAudio({ masterVolume: v / 100 }, true);
          }
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Música del Juego',
          'Ambiente sintetizado urbano durante la exploración.',
          aud.musicEnabled,
          'ACTIVADA',
          'DESACTIVADA',
          () => {
            handlers.onUpdateAudio({ musicEnabled: !aud.musicEnabled });
          }
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Efectos de Sonido (SFX)',
          'Puertas, bocinas, sirenas policiales, choques y misiones.',
          aud.sfxEnabled,
          'ACTIVADOS',
          'DESACTIVADOS',
          () => {
            handlers.onUpdateAudio({ sfxEnabled: !aud.sfxEnabled });
          }
        )
      );

      dom.menuContent.appendChild(panel);
      return;
    }

    // 4. CONTROLES TÁCTILES SECTION
    if (currentMenuSection === 'controles') {
      const tch = data.settings.touch;
      const panel = document.createElement('div');
      panel.className = 'setting-panel';

      panel.appendChild(
        makeChoiceRow(
          'Activar Controles Táctiles',
          'Auto los muestra en celulares y tablets táctiles.',
          [
            { value: 'auto', label: 'AUTO' },
            { value: 'on', label: 'ACTIVADOS' },
            { value: 'off', label: 'DESACTIVADOS' }
          ],
          tch.mode,
          (val) => handlers.onUpdateTouch({ mode: val })
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Mostrar u Ocultar Joystick',
          'Alterna entre joystick analógico o cruceta direccional.',
          tch.showJoystick,
          'JOYSTICK VISIBLE',
          'JOYSTICK OCULTO',
          () => handlers.onUpdateTouch({ showJoystick: !tch.showJoystick })
        )
      );

      panel.appendChild(
        makeSliderRow(
          'Sensibilidad del Joystick',
          'Ajusta la respuesta del joystick al caminar o girar.',
          50,
          200,
          Math.round((tch.sensitivity || 1.0) * 100),
          (v) => `${(v / 100).toFixed(1)}x`,
          (v) => handlers.onUpdateTouch({ sensitivity: v / 100 }, true)
        )
      );

      panel.appendChild(
        makeChoiceRow(
          'Tamaño de Botones Táctiles',
          'Adapta el tamaño de los controles a tu pantalla.',
          [
            { value: 'compact', label: 'COMPACTO' },
            { value: 'normal', label: 'NORMAL' },
            { value: 'large', label: 'GRANDE' }
          ],
          tch.buttonSize || 'normal',
          (val) => handlers.onUpdateTouch({ buttonSize: val })
        )
      );

      panel.appendChild(
        makeSliderRow(
          'Opacidad de Controles',
          'Transparencia de los botones sobre la ciudad.',
          40,
          100,
          Math.round((tch.opacity || 0.85) * 100),
          (v) => `${v}%`,
          (v) => handlers.onUpdateTouch({ opacity: v / 100 }, true)
        )
      );

      panel.appendChild(
        makeChoiceRow(
          'Dirección al Conducir',
          'Elige botones IZQ/DER o joystick para girar el auto.',
          [
            { value: 'buttons', label: 'BOTONES IZQ/DER' },
            { value: 'joystick', label: 'JOYSTICK' }
          ],
          tch.carSteerMode || 'buttons',
          (val) => handlers.onUpdateTouch({ carSteerMode: val })
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Disposición de Manos',
          'Invierte dirección y pedales para mayor comodidad.',
          tch.swapSides,
          'INVERTIDO (ZURDO)',
          'ESTÁNDAR',
          () => handlers.onUpdateTouch({ swapSides: !tch.swapSides })
        )
      );

      dom.menuContent.appendChild(panel);
      return;
    }

    // 5. MAPA SECTION
    if (currentMenuSection === 'mapa') {
      const topBar = document.createElement('div');
      topBar.className = 'garage-current';
      topBar.innerHTML = `
        <div class="garage-current-info">
          <strong>MAPA EXPANDIDO DE CIUDAD CERO (6 BARRIOS)</strong>
          <small>Explora los 6 distritos conectados o marca un punto GPS en el radar.</small>
        </div>
      `;
      const openMapBtn = document.createElement('button');
      openMapBtn.type = 'button';
      openMapBtn.className = 'g-btn g-btn-sky';
      openMapBtn.textContent = '🗺️ ABRIR MAPA AMPLIADO';
      openMapBtn.addEventListener('click', () => {
        closeMenuModal();
        if (handlers.onOpenFullMap) handlers.onOpenFullMap();
      });
      topBar.appendChild(openMapBtn);
      dom.menuContent.appendChild(topBar);

      const list = document.createElement('div');
      list.className = 'garage-list';
      (CiudadCero.Config.DISTRICTS || []).forEach((d) => {
        const row = document.createElement('div');
        row.className = 'garage-slot';
        row.innerHTML = `
          <div class="garage-slot-left">
            <span class="swatch" style="background:${d.color}"></span>
            <div class="garage-slot-meta">
              <strong>${d.name.toUpperCase()} (${d.avenueLabel})</strong>
              <small>${d.description}</small>
            </div>
          </div>
        `;
        const btns = document.createElement('div');
        btns.className = 'garage-slot-btns';
        const gpsBtn = document.createElement('button');
        gpsBtn.type = 'button';
        gpsBtn.className = 'g-btn';
        gpsBtn.textContent = '📍 MARCAR GPS';
        gpsBtn.addEventListener('click', () => {
          if (handlers.onSetWaypoint) {
            handlers.onSetWaypoint({ x: d.center.x, y: d.center.y, label: d.shortName });
          }
          closeMenuModal();
          if (handlers.onCloseMenu) handlers.onCloseMenu();
        });
        btns.appendChild(gpsBtn);
        row.appendChild(btns);
        list.appendChild(row);
      });

      dom.menuContent.appendChild(list);
      return;
    }

    // 6. CONFIGURACIÓN GENERAL SECTION
    if (currentMenuSection === 'configuracion') {
      const gen = data.settings.general;
      const panel = document.createElement('div');
      panel.className = 'setting-panel';

      panel.appendChild(
        makeToggleRow(
          'Minimapa en Pantalla',
          'Muestra el radar compacto en la esquina superior derecha.',
          gen.showMinimap,
          'VISIBLE',
          'OCULTO',
          () => handlers.onUpdateGeneral({ showMinimap: !gen.showMinimap })
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Indicador de Barrio y Avenida',
          'Muestra en qué zona de la ciudad te encuentras.',
          gen.showDistrictBadge,
          'VISIBLE',
          'OCULTO',
          () => handlers.onUpdateGeneral({ showDistrictBadge: !gen.showDistrictBadge })
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Semáforos en Radar y Mapa',
          'Muestra el estado en vivo de los semáforos en el minimapa y mapa.',
          gen.showTrafficLightsOnMap !== false,
          'ACTIVOS',
          'OCULTOS',
          () => handlers.onUpdateGeneral({ showTrafficLightsOnMap: !(gen.showTrafficLightsOnMap !== false) })
        )
      );

      panel.appendChild(
        makeChoiceRow(
          'Calidad Gráfica y Efectos',
          'Usa Rendimiento para ahorrar batería en celulares.',
          [
            { value: 'high', label: 'ALTA (LUCES)' },
            { value: 'performance', label: 'RENDIMIENTO' }
          ],
          gen.quality || 'high',
          (val) => handlers.onUpdateGeneral({ quality: val })
        )
      );

      panel.appendChild(
        makeToggleRow(
          'Guardado Automático',
          'Guarda tu progreso automáticamente al completar misiones.',
          gen.autoSave,
          'ACTIVADO',
          'DESACTIVADO',
          () => handlers.onUpdateGeneral({ autoSave: !gen.autoSave })
        )
      );

      const footerActions = document.createElement('div');
      footerActions.className = 'action-btn-grid';

      const resetDefaultsBtn = document.createElement('button');
      resetDefaultsBtn.type = 'button';
      resetDefaultsBtn.className = 'hud-btn';
      resetDefaultsBtn.textContent = 'RESTAURAR AJUSTES POR DEFECTO';
      resetDefaultsBtn.addEventListener('click', () => {
        if (handlers.onResetSettings) handlers.onResetSettings();
      });

      const backToGameBtn = document.createElement('button');
      backToGameBtn.type = 'button';
      backToGameBtn.className = 'g-btn';
      backToGameBtn.textContent = '▶ VOLVER AL JUEGO';
      backToGameBtn.addEventListener('click', () => {
        if (handlers.onCloseMenu) handlers.onCloseMenu();
      });

      footerActions.appendChild(resetDefaultsBtn);
      footerActions.appendChild(backToGameBtn);
      panel.appendChild(footerActions);

      dom.menuContent.appendChild(panel);
    }
  }

  /* ============================================================================
     EXPANDED INTERACTIVE MAP MODAL
     ============================================================================ */
  function isMapOpen() {
    return dom.mapModal && !dom.mapModal.classList.contains('hidden');
  }

  function redrawFullMap() {
    if (!isMapOpen() || !lastMapArgs) return;
    lastMapArgs.data.simTime = performance.now() / 1000;
    mapView.lastTransform = CiudadCero.Renderer.renderFullMap(
      dom.fullMapCanvas,
      mapView,
      lastMapArgs.data
    );
    if (dom.btnMapClearGps) {
      dom.btnMapClearGps.classList.toggle('hidden', !lastMapArgs.data.customWaypoint);
    }
    if (dom.mapGpsStatus && lastMapArgs.data.player) {
      const p = lastMapArgs.data.player;
      const wp = lastMapArgs.data.customWaypoint;
      const m = lastMapArgs.data.mission;
      const route = lastMapArgs.data.navigationRoute || [];
      let routeLength = 0;
      for (let i = 1; i < route.length; i++) routeLength += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
      const routeMeters = routeLength ? Math.round(routeLength / 10) : null;
      if (wp) {
        const distM = routeMeters || Math.round(Math.hypot(wp.x - p.x, wp.y - p.y) / 10);
        dom.mapGpsStatus.textContent = `📍 RUTA POR CALLES → ${wp.label || 'PUNTO MARCADO'} (${distM} m aprox.)`;
      } else if (m) {
        const distM = routeMeters || Math.round(Math.hypot(m.x - p.x, m.y - p.y) / 10);
        dom.mapGpsStatus.textContent = `🎯 OBJETIVO: ${m.title.toUpperCase()} · RECORRIDO POR CALLES: ${distM} m aprox.`;
      } else {
        dom.mapGpsStatus.textContent = 'Toca cualquier punto del mapa, barrio o lugar destacado para fijar ruta GPS.';
      }
    }
  }

  function openMapModal(data, handlers) {
    if (!dom.mapModal) return;
    lastMapArgs = { data, handlers };
    mapView.zoom = 1;
    mapView.panX = 0;
    mapView.panY = 0;
    dom.mapModal.classList.remove('hidden');

    if (dom.mapDistrictsStrip) {
      dom.mapDistrictsStrip.innerHTML = '';
      (CiudadCero.Config.DISTRICTS || []).forEach((d) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'district-chip';
        chip.innerHTML = `
          <div>
            <strong style="color:${d.color}">${d.shortName}</strong>
            <small>${d.avenueLabel}</small>
          </div>
          <span style="font-size:10px;color:#38bdf8">GPS ▸</span>
        `;
        chip.addEventListener('click', () => {
          if (handlers && handlers.onSetWaypoint) {
            handlers.onSetWaypoint({ x: d.center.x, y: d.center.y, label: d.shortName });
          }
          redrawFullMap();
        });
        dom.mapDistrictsStrip.appendChild(chip);
      });
      (CiudadCero.Config.DISTRICTS || []).forEach((d) => {
        (d.neighborhoods || []).forEach((n) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'district-chip neighborhood-chip';
          chip.innerHTML = `
            <div>
              <strong style="color:${d.color}">${n.name.toUpperCase()}</strong>
              <small>LOSTON · BARRIO</small>
            </div>
            <span style="font-size:10px;color:#38bdf8">GPS ▸</span>
          `;
          chip.addEventListener('click', () => {
            if (handlers && handlers.onSetWaypoint) {
              handlers.onSetWaypoint({ x: n.center.x, y: n.center.y, label: n.shortName });
            }
            redrawFullMap();
          });
          dom.mapDistrictsStrip.appendChild(chip);
        });
      });
    }

    if (dom.mapLandmarksStrip) {
      dom.mapLandmarksStrip.innerHTML = '';
      (CiudadCero.Config.LANDMARKS || []).forEach((lm) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'landmark-chip';
        btn.textContent = `${lm.icon} ${lm.name}`;
        btn.addEventListener('click', () => {
          if (handlers && handlers.onSetWaypoint) {
            handlers.onSetWaypoint({ x: lm.x, y: lm.y, label: lm.name.toUpperCase() });
          }
          redrawFullMap();
        });
        dom.mapLandmarksStrip.appendChild(btn);
      });
    }

    if (dom.mapLandmarksStrip) {
      (CiudadCero.Config.STORES || []).forEach((store) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'landmark-chip';
        btn.textContent = `${store.icon} ${store.name}`;
        btn.addEventListener('click', () => {
          if (handlers && handlers.onSetWaypoint) {
            handlers.onSetWaypoint({ x: store.x, y: store.y, label: store.name.toUpperCase() });
          }
          redrawFullMap();
        });
        dom.mapLandmarksStrip.appendChild(btn);
      });
    }

    redrawFullMap();
  }

  function closeMapModal() {
    if (dom.mapModal) dom.mapModal.classList.add('hidden');
  }

  function zoomFullMap(delta) {
    mapView.zoom = Math.max(0.85, Math.min(2.8, mapView.zoom + delta));
    redrawFullMap();
  }

  function centerFullMap() {
    mapView.zoom = 1.4;
    mapView.panX = 0;
    mapView.panY = 0;
    if (lastMapArgs && lastMapArgs.data && lastMapArgs.data.player && dom.fullMapCanvas) {
      const p = lastMapArgs.data.player;
      const cw = dom.fullMapCanvas.width;
      const ch = dom.fullMapCanvas.height;
      const baseScale = Math.min(cw / CiudadCero.Config.WORLD.width, ch / CiudadCero.Config.WORLD.height);
      const scale = baseScale * mapView.zoom;
      mapView.panX = (CiudadCero.Config.WORLD.width * 0.5 - p.x) * scale;
      mapView.panY = (CiudadCero.Config.WORLD.height * 0.5 - p.y) * scale;
    }
    redrawFullMap();
  }

  function isStoreOpen() {
    return dom.storeModal && !dom.storeModal.classList.contains('hidden');
  }

  function closeStoreModal() {
    if (dom.storeModal) dom.storeModal.classList.add('hidden');
  }

  function openStoreModal(data, handlers) {
    renderStoreModal(data, handlers);
  }

  function renderStoreModal(data, handlers) {
    if (!dom.storeModal || !dom.storeContent || !data.store) return;
    dom.storeModal.classList.remove('hidden');
    if (dom.storeModalTitle) dom.storeModalTitle.textContent = data.store.name;
    if (dom.storeModalTag) dom.storeModalTag.textContent = data.store.type === 'weapons' ? 'ARMERÍA · EQUIPAMIENTO' : 'COMERCIO · ACTIVIDAD ILEGAL';
    dom.storeContent.innerHTML = '';

    const intro = document.createElement('p');
    intro.className = 'store-intro';
    intro.textContent = `${data.store.desc}  ·  Saldo disponible: $ ${data.money}`;
    dom.storeContent.appendChild(intro);

    if (data.store.type === 'weapons') {
      const inventory = data.inventory || { ownedWeapons: [], equippedWeapon: null, ammo: 0 };
      const equipped = (CiudadCero.Config.WEAPONS || []).find((w) => w.id === inventory.equippedWeapon);
      const current = document.createElement('div');
      current.className = 'store-status';
      current.textContent = `Equipo equipado: ${equipped ? equipped.name : 'Ninguno'} · Munición: ${inventory.ammo || 0}`;
      dom.storeContent.appendChild(current);
      (CiudadCero.Config.WEAPONS || []).forEach((item) => {
        const card = document.createElement('div');
        card.className = 'store-item';
        const copy = document.createElement('div');
        copy.className = 'store-item-copy';
        const name = document.createElement('strong'); name.textContent = item.name;
        const desc = document.createElement('small'); desc.textContent = `${item.desc} · $ ${item.price} · +${item.ammoOnPurchase} municiones`;
        copy.append(name, desc);
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'g-btn';
        const owned = inventory.ownedWeapons.includes(item.id);
        btn.textContent = owned ? (inventory.equippedWeapon === item.id ? 'EQUIPADA' : 'EQUIPAR') : 'COMPRAR';
        btn.disabled = inventory.equippedWeapon === item.id || (!owned && data.money < item.price);
        btn.addEventListener('click', () => owned ? handlers.onEquipWeapon(item.id) : handlers.onBuyWeapon(item.id));
        card.append(copy, btn); dom.storeContent.appendChild(card);
      });
      const ammo = CiudadCero.Config.WEAPON_AMMO;
      const ammoRow = document.createElement('div'); ammoRow.className = 'store-item';
      const ammoCopy = document.createElement('div'); ammoCopy.className = 'store-item-copy';
      const ammoName = document.createElement('strong'); ammoName.textContent = 'Paquete de munición';
      const ammoDesc = document.createElement('small'); ammoDesc.textContent = `+${ammo.amount} unidades · $ ${ammo.price}`;
      ammoCopy.append(ammoName, ammoDesc);
      const ammoBtn = document.createElement('button'); ammoBtn.type = 'button'; ammoBtn.className = 'g-btn'; ammoBtn.textContent = 'COMPRAR';
      ammoBtn.disabled = !inventory.equippedWeapon || data.money < ammo.price;
      ammoBtn.addEventListener('click', handlers.onBuyAmmo);
      ammoRow.append(ammoCopy, ammoBtn); dom.storeContent.appendChild(ammoRow);
    } else {
      const warning = document.createElement('div'); warning.className = 'store-warning';
      warning.textContent = data.cooldownUntil > Date.now() ? `Local cerrado temporalmente · ${Math.ceil((data.cooldownUntil - Date.now()) / 1000)} s` : 'El asalto activa una búsqueda policial de 2 estrellas. Necesitas llevar un arma equipada.';
      dom.storeContent.appendChild(warning);
      const action = document.createElement('button'); action.type = 'button'; action.className = 'g-btn g-btn-amber store-rob-btn';
      action.textContent = 'INICIAR ASALTO';
      action.disabled = data.cooldownUntil > Date.now() || !data.inventory || !data.inventory.equippedWeapon;
      action.addEventListener('click', handlers.onRobStore);
      dom.storeContent.appendChild(action);
    }
  }

  /* ============================================================================
     GARAGE, STORY & CONFIRM MODALS
     ============================================================================ */
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
      const getPortrait = (id, sz) =>
        CiudadCero.Characters && CiudadCero.Characters.getPortraitSVG
          ? CiudadCero.Characters.getPortraitSVG(id, sz)
          : id.charAt(0).toUpperCase();

      const p = CiudadCero.Config.PROTAGONIST;
      const pCard = document.createElement('div');
      pCard.className = 'char-card protagonist-card';
      pCard.innerHTML = `
        <div class="char-head">
          <span class="char-avatar" style="border-color:${p.color};color:${p.color}">${getPortrait(p.id, 42)}</span>
          <div>
            <strong>${p.name}</strong>
            <small>${p.role} · ${p.age} · ${p.origin}</small>
          </div>
        </div>
        ${p.appearance ? `<p><b>Apariencia:</b> ${p.appearance}</p>` : ''}
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
            <span class="char-avatar" style="border-color:${c.color};color:${c.color}">${getPortrait(c.id, 42)}</span>
            <div>
              <strong>${c.name}</strong>
              <small>${c.role}</small>
            </div>
          </div>
          ${c.appearance ? `<p><b>Apariencia:</b> ${c.appearance}</p>` : ''}
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
    isMenuOpen,
    openMenuModal,
    closeMenuModal,
    renderMenuModal,
    isMapOpen,
    openMapModal,
    closeMapModal,
    redrawFullMap,
    zoomFullMap,
    centerFullMap,
    isGarageOpen,
    closeGarageModal,
    isStoreOpen,
    openStoreModal,
    closeStoreModal,
    renderStoreModal,
    renderGarageModal,
    isStoryOpen,
    closeStoryModal,
    renderStoryModal,
    isConfirmOpen,
    openConfirmModal,
    closeConfirmModal
  };
})();
