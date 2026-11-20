window.CiudadCero = window.CiudadCero || {};

CiudadCero.Story = (() => {
  const Config = CiudadCero.Config;
  const Entities = CiudadCero.Entities;
  const Police = CiudadCero.Police;
  const Garage = CiudadCero.Garage;

  const flatCampaign = [];
  (Config.CHAPTERS || []).forEach((ch) => {
    (ch.missions || []).forEach((m) => {
      flatCampaign.push(Object.assign({}, m, { chapterTitle: ch.title, chapterNumber: ch.number }));
    });
  });

  const state = {
    mainIndex: 0,
    completedMainIds: new Set(),
    completedSideIds: new Set(),
    campaignFinished: false,
    activeMission: null,
    timeLeft: 0,
    dialogueQueue: [],
    dialogueIndex: 0,
    onDialogueFinish: null,
    npcTalkIndex: {}
  };

  function getCurrentChapter() {
    if (state.campaignFinished) {
      return Config.CHAPTERS[Config.CHAPTERS.length - 1];
    }
    const currentM = flatCampaign[state.mainIndex] || flatCampaign[flatCampaign.length - 1];
    const chId = currentM ? currentM.chapter : 1;
    return Config.CHAPTERS.find((c) => c.id === chId) || Config.CHAPTERS[0];
  }

  function getFlatCampaign() {
    return flatCampaign;
  }

  function getProgressSummary() {
    const ch = getCurrentChapter();
    return {
      chapterId: ch.id,
      chapterNumber: ch.number,
      chapterTitle: ch.title,
      mainIndex: state.mainIndex,
      totalMain: flatCampaign.length,
      completedMainCount: state.completedMainIds.size,
      completedSideCount: state.completedSideIds.size,
      campaignFinished: state.campaignFinished
    };
  }

  function exportState() {
    return {
      mainIndex: state.mainIndex,
      completedMainIds: Array.from(state.completedMainIds),
      completedSideIds: Array.from(state.completedSideIds),
      campaignFinished: state.campaignFinished
    };
  }

  function clearMissionEntities(vehicles) {
    if (!Array.isArray(vehicles)) return;
    for (let i = vehicles.length - 1; i >= 0; i--) {
      if (vehicles[i].isMissionTarget || vehicles[i].isChaseTarget) {
        vehicles.splice(i, 1);
      }
    }
  }

  function openDialogue(lines, onFinish) {
    if (!Array.isArray(lines) || lines.length === 0) {
      if (typeof onFinish === 'function') onFinish();
      return;
    }
    state.dialogueQueue = lines.slice();
    state.dialogueIndex = 0;
    state.onDialogueFinish = typeof onFinish === 'function' ? onFinish : null;
    CiudadCero.Audio.playDialogueBlip();
  }

  function getCurrentDialogueLine() {
    if (!state.dialogueQueue.length) return null;
    const item = state.dialogueQueue[state.dialogueIndex];
    if (!item) return null;
    const speakerObj =
      item.speaker === 'mateo'
        ? Config.PROTAGONIST
        : (Config.CHARACTERS[item.speaker] || Config.PROTAGONIST);
    return {
      speakerId: item.speaker,
      speakerName: speakerObj.name,
      speakerRole: speakerObj.role,
      speakerColor: speakerObj.color || '#d6f36a',
      text: item.text,
      index: state.dialogueIndex,
      total: state.dialogueQueue.length
    };
  }

  function advanceDialogue() {
    if (!state.dialogueQueue.length) return false;
    state.dialogueIndex += 1;
    if (state.dialogueIndex >= state.dialogueQueue.length) {
      const cb = state.onDialogueFinish;
      state.dialogueQueue = [];
      state.dialogueIndex = 0;
      state.onDialogueFinish = null;
      if (typeof cb === 'function') cb();
      return false;
    }
    CiudadCero.Audio.playDialogueBlip();
    return true;
  }

  function isDialogueOpen() {
    return state.dialogueQueue.length > 0;
  }

  function activateMission(template, ctx, isSide = false) {
    clearMissionEntities(ctx.vehicles);

    const m = Object.assign({}, template, {
      isSide,
      stage: 'main',
      checkpointIdx: 0,
      hasPackage: false,
      hasPassenger: false,
      targetVehicleId: null,
      targetHp: 0,
      targetMaxHp: 0
    });

    state.activeMission = m;
    state.timeLeft = m.timeLimit || 0;

    if (m.type === 'deliver_package') {
      m.stage = 'pickup';
      m.x = m.pickupX;
      m.y = m.pickupY;
    } else if (m.type === 'transport_person') {
      m.stage = 'pickup';
      m.x = m.pickupX;
      m.y = m.pickupY;
    } else if (m.type === 'checkpoints' || (m.type === 'wanted_run' && Array.isArray(m.checkpoints))) {
      m.stage = 'checkpoints';
      m.checkpointIdx = 0;
      m.x = m.checkpoints[0].x;
      m.y = m.checkpoints[0].y;
    } else if (m.type === 'recover_vehicle') {
      m.stage = 'pickup_vehicle';
      const targetCar = Entities.createVehicle({
        typeId: m.vehicleType || 'coupe',
        color: m.vehicleColor || '#22a37a',
        x: m.vehicleX,
        y: m.vehicleY,
        angle: 0,
        isAI: false,
        isParked: true,
        isMissionTarget: true
      });
      ctx.vehicles.push(targetCar);
      m.targetVehicleId = targetCar.id;
      m.x = targetCar.x;
      m.y = targetCar.y;
    } else if (m.type === 'chase_vehicle') {
      m.stage = 'chase';
      const chaseCar = Entities.createVehicle({
        typeId: m.chaseType || 'sedan',
        color: m.chaseColor || '#171c21',
        customName: m.chaseName || 'VEHÍCULO OBJETIVO',
        x: m.chaseSpawnX,
        y: m.chaseSpawnY,
        angle: 0,
        hp: m.chaseHp || 150,
        maxHp: m.chaseHp || 150,
        isAI: true,
        isParked: false,
        isChaseTarget: true,
        sirenActive: m.chaseType === 'police_enforcer'
      });
      ctx.vehicles.push(chaseCar);
      m.targetVehicleId = chaseCar.id;
      m.targetHp = chaseCar.hp;
      m.targetMaxHp = chaseCar.maxHp;
      m.x = chaseCar.x;
      m.y = chaseCar.y;
    }

    if (m.triggerWanted) {
      Police.setMinWanted(
        m.triggerWanted,
        ctx.player.x,
        ctx.player.y,
        `Alerta · ${m.title}`,
        ctx.onNotify
      );
    }

    if (m.startDialogue) {
      openDialogue(m.startDialogue);
    }
  }

  function startCurrentMainMission(ctx) {
    if (state.mainIndex >= flatCampaign.length) {
      state.campaignFinished = true;
      state.activeMission = null;
      state.timeLeft = 0;
      clearMissionEntities(ctx.vehicles);
      return;
    }
    const tpl = flatCampaign[state.mainIndex];
    activateMission(tpl, ctx, false);
  }

  function startSideMission(sideId, ctx) {
    const tpl = (Config.SIDE_MISSIONS || []).find((s) => s.id === sideId);
    if (!tpl) return false;
    activateMission(tpl, ctx, true);
    if (ctx.onNotify) {
      ctx.onNotify(`Encargo secundario iniciado: ${tpl.title}`);
    }
    return true;
  }

  function abandonSideMission(ctx) {
    if (!state.activeMission || !state.activeMission.isSide) return false;
    clearMissionEntities(ctx.vehicles);
    startCurrentMainMission(ctx);
    if (ctx.onNotify) {
      ctx.onNotify('Volviste a la misión de historia principal');
    }
    return true;
  }

  function initNewCampaign(ctx, playIntro = true) {
    state.mainIndex = 0;
    state.completedMainIds = new Set();
    state.completedSideIds = new Set();
    state.campaignFinished = false;
    state.activeMission = null;
    state.timeLeft = 0;
    state.dialogueQueue = [];
    state.dialogueIndex = 0;
    state.onDialogueFinish = null;

    startCurrentMainMission(ctx);
    if (playIntro && Config.INTRO_DIALOGUE) {
      openDialogue(Config.INTRO_DIALOGUE);
    }
  }

  function restoreFromSave(savedStory, ctx) {
    state.mainIndex = Math.max(0, Number(savedStory && savedStory.mainIndex) || 0);
    state.completedMainIds = new Set((savedStory && savedStory.completedMainIds) || []);
    state.completedSideIds = new Set((savedStory && savedStory.completedSideIds) || []);
    state.campaignFinished = Boolean(savedStory && savedStory.campaignFinished) || state.mainIndex >= flatCampaign.length;
    state.dialogueQueue = [];
    state.dialogueIndex = 0;
    state.onDialogueFinish = null;

    startCurrentMainMission(ctx);
  }

  function completeActiveMission(ctx) {
    const m = state.activeMission;
    if (!m) return;

    state.activeMission = null;
    state.timeLeft = 0;

    let unlockedName = null;
    if (m.unlockVehicle) {
      const wasNew = Garage.unlockVehicleType(m.unlockVehicle);
      const spec = Config.VEHICLE_TYPES[m.unlockVehicle];
      if (wasNew && spec) {
        unlockedName = spec.name;
      }
    }

    if (m.grantOwnedVehicle && ctx.player && ctx.player.vehicle) {
      Garage.addOwnedVehicleRecord(ctx.player.vehicle);
    }

    if (m.isSide) {
      state.completedSideIds.add(m.id);
    } else {
      state.completedMainIds.add(m.id);
      state.mainIndex += 1;
      if (state.mainIndex >= flatCampaign.length) {
        state.campaignFinished = true;
      }
    }

    CiudadCero.Audio.playMissionComplete();

    if (ctx.onMissionReward) {
      ctx.onMissionReward({
        title: m.title,
        reward: m.reward || 0,
        unlockedName,
        isSide: Boolean(m.isSide),
        campaignFinished: !m.isSide && state.campaignFinished
      });
    }

    clearMissionEntities(ctx.vehicles);

    const proceed = () => {
      startCurrentMainMission(ctx);
      if (ctx.onSaveProgress) ctx.onSaveProgress();
    };

    if (m.endDialogue && m.endDialogue.length > 0) {
      openDialogue(m.endDialogue, proceed);
    } else {
      proceed();
    }
  }

  function failActiveMission(ctx, reasonMsg) {
    const m = state.activeMission;
    if (!m) return;
    CiudadCero.Audio.playMissionFail();
    if (m.failWantedBonus) {
      Police.addWanted(
        m.failWantedBonus,
        ctx.player.x,
        ctx.player.y,
        reasonMsg || 'Misión fallida',
        ctx.onNotify
      );
    } else if (ctx.onNotify) {
      ctx.onNotify(reasonMsg || 'Misión fallida · Inténtalo de nuevo');
    }

    clearMissionEntities(ctx.vehicles);
    if (m.isSide) {
      startCurrentMainMission(ctx);
    } else {
      // Restart same campaign mission cleanly so story never breaks
      activateMission(flatCampaign[state.mainIndex], ctx, false);
    }
  }

  function findNearbyNPC(player, npcs) {
    if (!player || !Array.isArray(npcs)) return null;
    let best = null;
    let bestDist = Config.PLAYER.talkRadius;
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      const d = Math.hypot(npc.x - player.x, npc.y - player.y);
      if (d < bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    return best;
  }

  function interactWithNearbyNPC(ctx) {
    const npc = findNearbyNPC(ctx.player, ctx.npcs);
    if (!npc) return false;

    const m = state.activeMission;
    if (m && m.type === 'talk' && m.npcId === npc.id) {
      completeActiveMission(ctx);
      return true;
    }

    if (m && m.type === 'deliver_package' && m.stage === 'pickup' && m.pickupNpcId === npc.id) {
      m.stage = 'deliver';
      m.hasPackage = true;
      m.x = m.dropX;
      m.y = m.dropY;
      openDialogue(m.pickupDialogue || [
        { speaker: npc.id, text: 'Aquí tienes el paquete. Llévalo al punto marcado cuanto antes.' }
      ]);
      return true;
    }

    const charData = Config.CHARACTERS[npc.id];
    const lines = (charData && charData.ambientLines) || ['Todo tranquilo por este sector, Mateo.'];
    const idx = state.npcTalkIndex[npc.id] || 0;
    state.npcTalkIndex[npc.id] = (idx + 1) % lines.length;
    openDialogue([{ speaker: npc.id, text: lines[idx] }]);
    return true;
  }

  function onVehicleEntered(vehicle, ctx) {
    const m = state.activeMission;
    if (!m || !vehicle) return;

    if (m.type === 'recover_vehicle' && vehicle.id === m.targetVehicleId && m.stage === 'pickup_vehicle') {
      vehicle.isMissionTarget = false;
      vehicle.isPlayerOwned = true;
      m.stage = 'deliver_vehicle';
      m.x = m.destX;
      m.y = m.destY;
      Police.setMinWanted(
        m.stealWanted || 2,
        vehicle.x,
        vehicle.y,
        '¡Vehículo recuperado! Llévalo al Garaje Central',
        ctx.onNotify
      );
    }
  }

  function update(dt, ctx) {
    const m = state.activeMission;
    const p = ctx.player;
    if (!m || !p) return;

    if (state.timeLeft > 0) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        failActiveMission(ctx, '⏰ ¡Se acabó el tiempo de la misión!');
        return;
      }
    }

    // 1. TALK TO NPC
    if (m.type === 'talk') {
      const dist = Math.hypot(p.x - m.x, p.y - m.y);
      if (dist <= m.radius) {
        completeActiveMission(ctx);
      }
      return;
    }

    // 2. ESCAPE POLICE
    if (m.type === 'escape_police') {
      if (Police.state.wanted === 0) {
        completeActiveMission(ctx);
      }
      return;
    }

    // 3. DELIVER PACKAGE
    if (m.type === 'deliver_package') {
      const dist = Math.hypot(p.x - m.x, p.y - m.y);
      if (m.stage === 'pickup') {
        if (dist <= m.radius) {
          m.stage = 'deliver';
          m.hasPackage = true;
          m.x = m.dropX;
          m.y = m.dropY;
          if (m.pickupDialogue) {
            openDialogue(m.pickupDialogue);
          } else if (ctx.onNotify) {
            ctx.onNotify('📦 Paquete recogido · Llévalo al destino');
          }
        }
      } else if (m.stage === 'deliver') {
        if (dist <= m.radius) {
          if (m.requireClearWantedAtEnd && Police.state.wanted > 0) {
            if (ctx.onNotify) {
              ctx.onNotify('¡Pierde de vista a la policía (0★) en el punto de entrega!');
            }
            return;
          }
          completeActiveMission(ctx);
        }
      }
      return;
    }

    // 4. TRANSPORT PERSON
    if (m.type === 'transport_person') {
      const dist = Math.hypot(p.x - m.x, p.y - m.y);
      if (m.stage === 'pickup') {
        if (dist <= m.radius) {
          if (!p.inCar || !p.vehicle) {
            return;
          }
          m.stage = 'deliver';
          m.hasPassenger = true;
          m.x = m.destX;
          m.y = m.destY;
          if (m.pickupDialogue) {
            openDialogue(m.pickupDialogue);
          } else if (ctx.onNotify) {
            ctx.onNotify(`🧑 ${m.passengerName || 'Pasajero'} subió al vehículo`);
          }
        }
      } else if (m.stage === 'deliver') {
        if (dist <= m.radius && p.inCar) {
          completeActiveMission(ctx);
        }
      }
      return;
    }

    // 5. RECOVER SPECIFIC VEHICLE
    if (m.type === 'recover_vehicle') {
      const targetVeh = ctx.vehicles.find((v) => v.id === m.targetVehicleId);
      if (!targetVeh) {
        failActiveMission(ctx, 'El vehículo objetivo se perdió.');
        return;
      }
      if (p.vehicle === targetVeh) {
        m.stage = 'deliver_vehicle';
        m.x = m.destX;
        m.y = m.destY;
        const distDest = Math.hypot(targetVeh.x - m.destX, targetVeh.y - m.destY);
        if (distDest <= m.radius) {
          completeActiveMission(ctx);
        }
      } else {
        m.stage = 'pickup_vehicle';
        m.x = targetVeh.x;
        m.y = targetVeh.y;
      }
      return;
    }

    // 6. STEAL VEHICLE OF TYPE
    if (m.type === 'steal_type') {
      if (p.inCar && p.vehicle && p.vehicle.typeId === m.requiredVehicleType) {
        m.stage = 'deliver_vehicle';
        m.x = m.destX;
        m.y = m.destY;
        const distDest = Math.hypot(p.vehicle.x - m.destX, p.vehicle.y - m.destY);
        if (distDest <= m.radius) {
          completeActiveMission(ctx);
        }
      } else {
        m.stage = 'find_type';
        const matching = ctx.vehicles.find((v) => v.typeId === m.requiredVehicleType);
        if (matching) {
          m.x = matching.x;
          m.y = matching.y;
        }
      }
      return;
    }

    // 7. CHASE & DISABLE TARGET VEHICLE
    if (m.type === 'chase_vehicle') {
      if (m.stage === 'chase') {
        const targetVeh = ctx.vehicles.find((v) => v.id === m.targetVehicleId);
        if (!targetVeh) {
          completeActiveMission(ctx);
          return;
        }
        m.x = targetVeh.x;
        m.y = targetVeh.y;
        m.targetHp = targetVeh.hp;
        m.targetMaxHp = targetVeh.maxHp;

        if (targetVeh.hp <= 30) {
          targetVeh.isChaseTarget = false;
          targetVeh.isAI = false;
          targetVeh.isParked = true;
          if (m.returnToGarageAfter) {
            m.stage = 'return';
            m.x = m.destX;
            m.y = m.destY;
            if (ctx.onNotify) {
              ctx.onNotify('¡Objetivo neutralizado! Vuelve al Garaje Central y escapa (0★).');
            }
          } else {
            completeActiveMission(ctx);
          }
        }
      } else if (m.stage === 'return') {
        const distDest = Math.hypot(p.x - m.destX, p.y - m.destY);
        if (distDest <= m.radius && Police.state.wanted === 0) {
          completeActiveMission(ctx);
        }
      }
      return;
    }

    // 8. CHECKPOINTS / WANTED RUN
    if (m.stage === 'checkpoints' && Array.isArray(m.checkpoints)) {
      const cp = m.checkpoints[m.checkpointIdx];
      if (!cp) {
        completeActiveMission(ctx);
        return;
      }
      m.x = cp.x;
      m.y = cp.y;
      const dist = Math.hypot(p.x - cp.x, p.y - cp.y);
      if (dist <= m.radius) {
        if (m.minWantedRequired && Police.state.wanted < m.minWantedRequired) {
          if (ctx.onNotify) {
            ctx.onNotify(`Necesitas ${m.minWantedRequired}★ o más para validar este punto`);
          }
          return;
        }
        m.checkpointIdx += 1;
        CiudadCero.Audio.playGarageAction();
        if (m.checkpointIdx >= m.checkpoints.length) {
          completeActiveMission(ctx);
        } else {
          m.x = m.checkpoints[m.checkpointIdx].x;
          m.y = m.checkpoints[m.checkpointIdx].y;
          if (ctx.onNotify) {
            ctx.onNotify(`Punto de control ${m.checkpointIdx}/${m.checkpoints.length} completado`);
          }
        }
      }
      return;
    }

    // 9. STANDARD REACH
    const dist = Math.hypot(p.x - m.x, p.y - m.y);
    if (dist <= m.radius) {
      completeActiveMission(ctx);
    }
  }

  function getDynamicInstruction(inCar) {
    const m = state.activeMission;
    if (!m) {
      return {
        tag: 'MODO LIBRE',
        title: 'Campaña completada · Explora Ciudad Cero',
        help: 'Abre HISTORIA (H) para repetir misiones o jugar encargos secundarios.',
        hasTarget: false
      };
    }

    const prefix = m.isSide ? `SECUNDARIA · ${m.code}` : `CAP. ${m.chapter} · MISIÓN ${m.code}`;
    let help = inCar ? m.helpCar : m.helpFoot;

    if (m.type === 'deliver_package') {
      if (m.stage === 'pickup') {
        help = 'Dirígete al marcador amarillo para recoger el paquete.';
      } else {
        help = m.requireClearWantedAtEnd
          ? 'Lleva el paquete al destino y pierde a la policía (0★).'
          : 'Paquete a bordo: entrégalo en el punto marcado.';
      }
    } else if (m.type === 'transport_person') {
      if (m.stage === 'pickup') {
        help = inCar
          ? `Acércate al marcador para recoger a ${m.passengerName || 'tu pasajero'}.`
          : `Consigue un vehículo para recoger a ${m.passengerName || 'tu pasajero'}.`;
      } else {
        help = `${m.passengerName || 'Pasajero'} a bordo: llévalo al destino marcado.`;
      }
    } else if (m.type === 'recover_vehicle') {
      help = m.stage === 'pickup_vehicle'
        ? 'Localiza y sube al Coupé GT marcado en verde.'
        : 'Conduce el Coupé GT recuperado hasta el Garaje Central.';
    } else if (m.type === 'steal_type') {
      help = m.stage === 'find_type'
        ? 'Busca y sube a una Furgoneta Cargo en la ciudad.'
        : 'Entrega la Furgoneta Cargo en el Taller Distrito Este.';
    } else if (m.type === 'chase_vehicle') {
      if (m.stage === 'chase') {
        help = 'Persigue y embiste al vehículo objetivo hasta detenerlo.';
      } else {
        help = 'Regresa al Garaje Central y pierde la alerta policial (0★).';
      }
    } else if (m.stage === 'checkpoints' && Array.isArray(m.checkpoints)) {
      help = `Punto de control ${m.checkpointIdx + 1}/${m.checkpoints.length} · ${inCar ? m.helpCar : m.helpFoot}`;
    }

    return {
      tag: prefix,
      title: m.title,
      help,
      hasTarget: true,
      x: m.x,
      y: m.y,
      stage: m.stage,
      hasPackage: m.hasPackage,
      hasPassenger: m.hasPassenger,
      passengerName: m.passengerName,
      isChase: m.type === 'chase_vehicle' && m.stage === 'chase',
      targetHp: m.targetHp,
      targetMaxHp: m.targetMaxHp,
      timeLeft: state.timeLeft
    };
  }

  return {
    state,
    getCurrentChapter,
    getFlatCampaign,
    getProgressSummary,
    exportState,
    openDialogue,
    getCurrentDialogueLine,
    advanceDialogue,
    isDialogueOpen,
    startCurrentMainMission,
    startSideMission,
    abandonSideMission,
    initNewCampaign,
    restoreFromSave,
    findNearbyNPC,
    interactWithNearbyNPC,
    onVehicleEntered,
    update,
    getDynamicInstruction
  };
})();
