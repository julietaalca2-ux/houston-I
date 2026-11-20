window.CiudadCero = window.CiudadCero || {};

CiudadCero.Characters = (() => {
  const SKIN_TONES = {
    mateo: '#dfb08a',
    nora: '#e6b894',
    ramiro: '#cf9b74',
    valeria: '#ecc3a3',
    donato: '#c68b63',
    elena: '#e4b390',
    davila: '#d6a37c',
    light: '#edd0b4',
    medium: '#dfb08a',
    olive: '#cfa078',
    tan: '#bd835b',
    deep: '#8c583a'
  };

  // Visual profiles for protagonist and all named story characters
  const STORY_PROFILES = {
    mateo: {
      id: 'mateo',
      shoulderW: 17.5,
      torsoDepth: 9.5,
      headR: 4.9,
      skin: SKIN_TONES.mateo,
      torsoPrimary: '#243327',
      torsoSecondary: '#18211a',
      accent: '#d6f36a',
      trim: '#9ec447',
      sleeve: '#243327',
      glove: '#151916',
      shoe: '#1a1f1c',
      hairColor: '#1b201c',
      hairHighlight: '#364239',
      hairStyle: 'mateo_swept',
      outfitStyle: 'pilot_jacket',
      hatType: 'none',
      accessory: 'none'
    },
    nora: {
      id: 'nora',
      shoulderW: 16.2,
      torsoDepth: 8.8,
      headR: 4.7,
      skin: SKIN_TONES.nora,
      torsoPrimary: '#e3b42b',
      torsoSecondary: '#252a27',
      accent: '#f5d94b',
      trim: '#8c6b14',
      sleeve: '#252a27',
      glove: '#3b322c',
      shoe: '#26201c',
      hairColor: '#422618',
      hairHighlight: '#693f2a',
      hairStyle: 'bun',
      outfitStyle: 'overalls',
      hatType: 'none',
      accessory: 'wrench'
    },
    ramiro: {
      id: 'ramiro',
      shoulderW: 16.8,
      torsoDepth: 9.0,
      headR: 4.8,
      skin: SKIN_TONES.ramiro,
      torsoPrimary: '#365166',
      torsoSecondary: '#243747',
      accent: '#6cb2d1',
      trim: '#eef4f8',
      sleeve: '#365166',
      glove: SKIN_TONES.ramiro,
      shoe: '#14171a',
      hairColor: '#1d2126',
      hairHighlight: '#3e4652',
      hairStyle: 'slick_part',
      outfitStyle: 'suit',
      hatType: 'none',
      accessory: 'briefcase'
    },
    valeria: {
      id: 'valeria',
      shoulderW: 15.8,
      torsoDepth: 8.5,
      headR: 4.7,
      skin: SKIN_TONES.valeria,
      torsoPrimary: '#1f9d76',
      torsoSecondary: '#162426',
      accent: '#4de0b5',
      trim: '#9ff7dc',
      sleeve: '#1f9d76',
      glove: '#1d2b2e',
      shoe: '#1c2426',
      hairColor: '#692136',
      hairHighlight: '#963350',
      hairStyle: 'asym_bob',
      outfitStyle: 'tech_jacket',
      hatType: 'visor',
      accessory: 'scanner'
    },
    donato: {
      id: 'donato',
      shoulderW: 19.2,
      torsoDepth: 10.2,
      headR: 5.0,
      skin: SKIN_TONES.donato,
      torsoPrimary: '#d97724',
      torsoSecondary: '#24394a',
      accent: '#f5d94b',
      trim: '#f4f7f5',
      sleeve: '#24394a',
      glove: '#4a3d33',
      shoe: '#261f1a',
      hairColor: '#5c5752',
      hairHighlight: '#857f78',
      hairStyle: 'short_crop',
      outfitStyle: 'hi_vis_vest',
      hatType: 'dock_cap',
      accessory: 'clipboard'
    },
    elena: {
      id: 'elena',
      shoulderW: 16.0,
      torsoDepth: 8.6,
      headR: 4.7,
      skin: SKIN_TONES.elena,
      torsoPrimary: '#c44569',
      torsoSecondary: '#241a21',
      accent: '#f48fb1',
      trim: '#ffffff',
      sleeve: '#c44569',
      glove: '#1c181b',
      shoe: '#1f1b1e',
      hairColor: '#231820',
      hairHighlight: '#4a3344',
      hairStyle: 'ponytail',
      outfitStyle: 'racer_jacket',
      hatType: 'none',
      accessory: 'stopwatch'
    },
    davila: {
      id: 'davila',
      shoulderW: 18.2,
      torsoDepth: 9.8,
      headR: 4.9,
      skin: SKIN_TONES.davila,
      torsoPrimary: '#162230',
      torsoSecondary: '#0e1620',
      accent: '#ff3b30',
      trim: '#f5d94b',
      sleeve: '#162230',
      glove: '#14181d',
      shoe: '#111418',
      hairColor: '#6b747d',
      hairHighlight: '#96a0ab',
      hairStyle: 'short_crop',
      outfitStyle: 'commander',
      hatType: 'police_cap',
      accessory: 'radio'
    },
    police_foot: {
      id: 'police_foot',
      shoulderW: 17.2,
      torsoDepth: 9.2,
      headR: 4.8,
      skin: SKIN_TONES.medium,
      torsoPrimary: '#1a2b3c',
      torsoSecondary: '#111c28',
      accent: '#3898ff',
      trim: '#cfd9e3',
      sleeve: '#1a2b3c',
      glove: '#161b20',
      shoe: '#121518',
      hairColor: '#22262b',
      hairHighlight: '#3b424a',
      hairStyle: 'short_crop',
      outfitStyle: 'police_uniform',
      hatType: 'police_cap',
      accessory: 'radio'
    }
  };

  function angleDiff(target, current) {
    let d = target - current;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function stepAngle(current, target, rate, dt) {
    if (current === undefined || current === null || Number.isNaN(current)) return target;
    const diff = angleDiff(target, current);
    const factor = 1 - Math.exp(-rate * dt);
    let next = current + diff * factor;
    while (next > Math.PI) next -= Math.PI * 2;
    while (next < -Math.PI) next += Math.PI * 2;
    return next;
  }

  function updateVisuals(dt, state, spawnDustFn) {
    const p = state.player;
    if (p) {
      if (p.visualAngle === undefined) p.visualAngle = p.angle || 0;
      p.visualAngle = stepAngle(p.visualAngle, p.angle, 18, dt);
      p.idlePhase = (p.idlePhase || 0) + dt * 2.8;

      if (p.enterExitAnim) {
        p.enterExitAnim.timer -= dt;
        if (p.enterExitAnim.timer <= 0) {
          p.enterExitAnim = null;
        }
      }

      // Subtle sprint footstep dust puffs
      if (!p.inCar && p.speed > 185 && typeof spawnDustFn === 'function') {
        const stepBucket = Math.floor(p.walkPhase / Math.PI);
        if (stepBucket !== p.lastStepBucket) {
          p.lastStepBucket = stepBucket;
          const backX = p.x - Math.cos(p.visualAngle) * 6;
          const backY = p.y - Math.sin(p.visualAngle) * 6;
          spawnDustFn(backX, backY);
        }
      }
    }

    // Update vehicle door animations
    if (Array.isArray(state.vehicles)) {
      for (let i = 0; i < state.vehicles.length; i++) {
        const v = state.vehicles[i];
        if (v.doorAnim) {
          v.doorAnim.timer -= dt;
          if (v.doorAnim.timer <= 0) {
            v.doorAnim = null;
          }
        }
      }
    }

    // Update Story NPC idle breathing & gaze tracking when Mateo is nearby
    if (Array.isArray(state.npcs)) {
      for (let i = 0; i < state.npcs.length; i++) {
        const npc = state.npcs[i];
        if (npc.baseAngle === undefined) npc.baseAngle = npc.angle || Math.PI / 2;
        if (npc.visualAngle === undefined) npc.visualAngle = npc.baseAngle;
        npc.idlePhase = (npc.idlePhase || 0) + dt * (2.3 + (i % 3) * 0.25);

        let desiredAngle = npc.baseAngle;
        if (p) {
          const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
          if (dist < 115) {
            desiredAngle = Math.atan2(p.y - npc.y, p.x - npc.x);
            npc.isAwareOfPlayer = true;
          } else {
            npc.isAwareOfPlayer = false;
            // Subtle natural look-around in idle
            desiredAngle = npc.baseAngle + Math.sin(npc.idlePhase * 0.45) * 0.18;
          }
        }
        npc.visualAngle = stepAngle(npc.visualAngle, desiredAngle, 7.5, dt);
      }
    }

    // Update Pedestrian smooth turning, breathing, and alert icons
    if (Array.isArray(state.pedestrians)) {
      for (let i = 0; i < state.pedestrians.length; i++) {
        const ped = state.pedestrians[i];
        if (ped.visualAngle === undefined) ped.visualAngle = ped.angle || 0;
        ped.visualAngle = stepAngle(ped.visualAngle, ped.angle, 14, dt);
        ped.idlePhase = (ped.idlePhase || 0) + dt * 2.5;
        if (ped.alertIconTimer > 0) {
          ped.alertIconTimer = Math.max(0, ped.alertIconTimer - dt);
        }
      }
    }
  }

  function drawRoundedCapsule(ctx, x, y, w, h, r) {
    const hw = w * 0.5;
    const hh = h * 0.5;
    const rad = Math.min(r, hw, hh);
    ctx.beginPath();
    ctx.moveTo(x - hw + rad, y - hh);
    ctx.lineTo(x + hw - rad, y - hh);
    ctx.quadraticCurveTo(x + hw, y - hh, x + hw, y - hh + rad);
    ctx.lineTo(x + hw, y + hh - rad);
    ctx.quadraticCurveTo(x + hw, y + hh, x + hw - rad, y + hh);
    ctx.lineTo(x - hw + rad, y + hh);
    ctx.quadraticCurveTo(x - hw, y + hh, x - hw, y + hh - rad);
    ctx.lineTo(x - hw, y - hh + rad);
    ctx.quadraticCurveTo(x - hw, y - hh, x - hw + rad, y - hh);
    ctx.closePath();
  }

  function drawAccessory(ctx, accType, rightHandX, rightHandY, leftHandX, leftHandY, now) {
    if (!accType || accType === 'none') return;

    if (accType === 'wrench') {
      ctx.save();
      ctx.translate(rightHandX + 2.5, rightHandY + 0.5);
      ctx.rotate(0.35);
      ctx.fillStyle = '#c5d1d8';
      ctx.strokeStyle = '#18201c';
      ctx.lineWidth = 0.9;
      ctx.fillRect(-1.5, -1.2, 8.5, 2.4);
      ctx.strokeRect(-1.5, -1.2, 8.5, 2.4);
      ctx.beginPath();
      ctx.arc(7.2, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (accType === 'briefcase') {
      ctx.save();
      ctx.translate(rightHandX, rightHandY + 2.2);
      ctx.fillStyle = '#181e24';
      ctx.strokeStyle = '#0c0f12';
      ctx.lineWidth = 1;
      ctx.fillRect(-4.2, -1.6, 8.4, 3.2);
      ctx.strokeRect(-4.2, -1.6, 8.4, 3.2);
      ctx.fillStyle = '#f5d94b';
      ctx.fillRect(-1, -1.7, 2, 1);
      ctx.restore();
    } else if (accType === 'scanner') {
      ctx.save();
      ctx.translate(rightHandX + 2.8, rightHandY - 1.5);
      ctx.rotate(-0.28);
      ctx.fillStyle = '#152529';
      ctx.strokeStyle = '#4de0b5';
      ctx.lineWidth = 1;
      ctx.fillRect(-2.5, -3.2, 5, 6.4);
      ctx.strokeRect(-2.5, -3.2, 5, 6.4);
      const glow = 0.55 + Math.sin((now || 0) / 180) * 0.35;
      ctx.fillStyle = `rgba(77, 224, 181, ${glow.toFixed(2)})`;
      ctx.fillRect(-1.5, -2.2, 3, 4.4);
      ctx.restore();
    } else if (accType === 'clipboard') {
      ctx.save();
      ctx.translate(rightHandX + 2.2, rightHandY - 1.0);
      ctx.rotate(-0.2);
      ctx.fillStyle = '#d9c5a0';
      ctx.strokeStyle = '#2b241c';
      ctx.lineWidth = 0.9;
      ctx.fillRect(-2.4, -3.0, 4.8, 6.0);
      ctx.strokeRect(-2.4, -3.0, 4.8, 6.0);
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(-1.4, -3.3, 2.8, 1.3);
      ctx.restore();
    } else if (accType === 'stopwatch') {
      ctx.save();
      ctx.translate(rightHandX + 2.0, rightHandY - 0.5);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#1e1b1e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f48fb1';
      ctx.beginPath();
      ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (accType === 'shopping_bag') {
      ctx.save();
      ctx.translate(rightHandX, rightHandY + 2.3);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#1f1b16';
      ctx.lineWidth = 0.9;
      ctx.fillRect(-3.2, -1.8, 6.4, 3.6);
      ctx.strokeRect(-3.2, -1.8, 6.4, 3.6);
      ctx.restore();
    } else if (accType === 'box') {
      ctx.save();
      const midX = (rightHandX + leftHandX) * 0.5 + 2.2;
      ctx.translate(midX, 0);
      ctx.fillStyle = '#b88655';
      ctx.strokeStyle = '#2d2116';
      ctx.lineWidth = 1;
      ctx.fillRect(-3.2, -4.5, 6.4, 9.0);
      ctx.strokeRect(-3.2, -4.5, 6.4, 9.0);
      ctx.strokeStyle = '#e6c49a';
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(0, 4.5);
      ctx.stroke();
      ctx.restore();
    } else if (accType === 'radio') {
      ctx.save();
      ctx.translate(rightHandX + 1.5, rightHandY + 0.5);
      ctx.fillStyle = '#11161c';
      ctx.fillRect(-1.2, -1.2, 4.2, 2.2);
      ctx.fillStyle = '#3898ff';
      ctx.fillRect(1.8, -0.6, 1.2, 1.2);
      ctx.restore();
    }
  }

  function drawOutfitDetails(ctx, profile, torsoW, shoulderW) {
    const style = profile.outfitStyle || 'casual_jacket';

    if (style === 'pilot_jacket') {
      // Mateo's signature mechanic-pilot jacket: dark olive base + lime collar & shoulder stripes
      ctx.fillStyle = profile.torsoSecondary;
      ctx.fillRect(-torsoW * 0.45, -shoulderW * 0.24, torsoW * 0.72, shoulderW * 0.48);

      // Lime racing/mechanic shoulder stripes
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-torsoW * 0.15, -shoulderW * 0.46, torsoW * 0.36, 2.1);
      ctx.fillRect(-torsoW * 0.15, shoulderW * 0.46 - 2.1, torsoW * 0.36, 2.1);

      // High collar accent behind neck
      ctx.fillStyle = profile.accent;
      ctx.beginPath();
      ctx.arc(-0.4, 0, 5.4, Math.PI * 0.65, Math.PI * 1.35);
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = profile.accent;
      ctx.stroke();
    } else if (style === 'overalls') {
      // Nora's yellow mechanic overalls over dark shirt + tool belt
      ctx.fillStyle = profile.torsoSecondary;
      ctx.fillRect(-torsoW * 0.36, -shoulderW * 0.48, torsoW * 0.72, 2.4);
      ctx.fillRect(-torsoW * 0.36, shoulderW * 0.48 - 2.4, torsoW * 0.72, 2.4);

      // Overall straps
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-torsoW * 0.28, -shoulderW * 0.28, torsoW * 0.56, 2.0);
      ctx.fillRect(-torsoW * 0.28, shoulderW * 0.28 - 2.0, torsoW * 0.56, 2.0);

      // Rear utility belt
      ctx.fillStyle = '#3b2e23';
      ctx.fillRect(-torsoW * 0.48, -shoulderW * 0.36, 2.0, shoulderW * 0.72);
    } else if (style === 'suit') {
      // Ramiro's tailored suit with crisp collar & center seam
      ctx.strokeStyle = profile.torsoSecondary;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-torsoW * 0.44, 0);
      ctx.lineTo(torsoW * 0.35, 0);
      ctx.stroke();

      // White shirt collar + light blue tie hint
      ctx.fillStyle = profile.trim;
      ctx.beginPath();
      ctx.arc(1.2, 0, 4.9, -0.55, 0.55);
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = profile.trim;
      ctx.stroke();
    } else if (style === 'tech_jacket') {
      // Valeria's cropped tech jacket with glowing cyan trim
      ctx.fillStyle = profile.torsoSecondary;
      ctx.fillRect(-torsoW * 0.42, -shoulderW * 0.28, torsoW * 0.65, shoulderW * 0.56);
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-torsoW * 0.34, -shoulderW * 0.44, torsoW * 0.52, 1.6);
      ctx.fillRect(-torsoW * 0.34, shoulderW * 0.44 - 1.6, torsoW * 0.52, 1.6);
    } else if (style === 'hi_vis_vest') {
      // High-visibility safety vest with reflective bands
      ctx.fillStyle = profile.trim;
      ctx.fillRect(-torsoW * 0.32, -shoulderW * 0.42, 1.8, shoulderW * 0.84);
      ctx.fillRect(torsoW * 0.08, -shoulderW * 0.42, 1.8, shoulderW * 0.84);
    } else if (style === 'racer_jacket') {
      // Elena's crimson racing jacket with twin white stripes
      ctx.fillStyle = profile.trim;
      ctx.fillRect(-torsoW * 0.38, -2.5, torsoW * 0.76, 1.5);
      ctx.fillRect(-torsoW * 0.38, 1.0, torsoW * 0.76, 1.5);
    } else if (style === 'commander' || style === 'police_uniform') {
      // Epaulets + tactical belt
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-1.5, -shoulderW * 0.47, 3.6, 2.3);
      ctx.fillRect(-1.5, shoulderW * 0.47 - 2.3, 3.6, 2.3);
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(-torsoW * 0.46, -shoulderW * 0.38, 1.8, shoulderW * 0.76);
    } else if (style === 'casual_hoodie') {
      // Folded hood behind neck
      ctx.fillStyle = profile.torsoSecondary || 'rgba(0,0,0,0.22)';
      drawRoundedCapsule(ctx, -torsoW * 0.36, 0, 4.2, shoulderW * 0.52, 2);
      ctx.fill();
    } else {
      // Casual layered shirt/jacket collar
      ctx.fillStyle = profile.torsoSecondary || 'rgba(255,255,255,0.16)';
      ctx.fillRect(-torsoW * 0.25, -shoulderW * 0.22, torsoW * 0.55, shoulderW * 0.44);
    }
  }

  function drawHeadAndHair(ctx, profile, headR) {
    const hx = 1.25;

    // Head base (skin)
    ctx.fillStyle = profile.skin || SKIN_TONES.medium;
    ctx.beginPath();
    ctx.arc(hx, 0, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#121613';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Subtle nose/brow forward orientation cue
    ctx.fillStyle = profile.skin || SKIN_TONES.medium;
    ctx.beginPath();
    ctx.arc(hx + headR * 0.88, 0, 1.45, 0, Math.PI * 2);
    ctx.fill();

    const hat = profile.hatType || 'none';
    const hairStyle = profile.hairStyle || 'short_crop';

    if (hat === 'hardhat') {
      ctx.fillStyle = profile.hatColor || '#facc15';
      ctx.beginPath();
      ctx.arc(hx, 0, headR + 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1d18';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // Hardhat central ridge
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(hx - headR * 0.7, 0);
      ctx.lineTo(hx + headR * 0.85, 0);
      ctx.stroke();
      return;
    }

    if (hat === 'police_cap' || hat === 'dock_cap') {
      // Hair fringe at back
      ctx.fillStyle = profile.hairColor || '#222';
      ctx.beginPath();
      ctx.arc(hx - 0.8, 0, headR * 0.94, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();

      // Cap crown
      ctx.fillStyle = hat === 'police_cap' ? '#14202e' : '#243647';
      ctx.beginPath();
      ctx.arc(hx - 0.2, 0, headR + 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0c1117';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Forward glossy visor brim
      ctx.fillStyle = '#0d1117';
      ctx.beginPath();
      ctx.arc(hx + 1.3, 0, headR * 0.92, -0.78, 0.78);
      ctx.fill();

      // Metallic badge on front of cap
      ctx.fillStyle = hat === 'police_cap' ? '#e2e8f0' : '#f5d94b';
      ctx.beginPath();
      ctx.arc(hx + headR * 0.65, 0, 1.35, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (hat === 'cap') {
      ctx.fillStyle = profile.hatColor || '#3898ff';
      ctx.beginPath();
      ctx.arc(hx - 0.2, 0, headR + 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#14191e';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      // Cap brim forward
      ctx.fillRect(hx + headR * 0.35, -2.7, 3.6, 5.4);
      return;
    }

    // Hairstyles
    ctx.fillStyle = profile.hairColor || '#231f1e';
    if (hairStyle === 'mateo_swept') {
      ctx.beginPath();
      ctx.arc(hx - 0.55, 0, headR * 0.96, Math.PI * 0.38, Math.PI * 1.62);
      ctx.fill();
      // Swept top lock
      ctx.beginPath();
      ctx.ellipse(hx - 0.4, 0, headR * 0.85, headR * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();
      if (profile.hairHighlight) {
        ctx.strokeStyle = profile.hairHighlight;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(hx - 2.6, -1.2);
        ctx.lineTo(hx + 1.4, -0.6);
        ctx.stroke();
      }
    } else if (hairStyle === 'bun') {
      ctx.beginPath();
      ctx.arc(hx - 0.45, 0, headR * 0.96, Math.PI * 0.35, Math.PI * 1.65);
      ctx.fill();
      // Hair bun at back
      ctx.beginPath();
      ctx.arc(hx - headR - 1.1, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = profile.accent || '#f5d94b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(hx - headR + 0.3, 0, 2.3, -0.9, 0.9);
      ctx.stroke();
    } else if (hairStyle === 'ponytail') {
      ctx.beginPath();
      ctx.arc(hx - 0.45, 0, headR * 0.96, Math.PI * 0.35, Math.PI * 1.65);
      ctx.fill();
      // Flowing ponytail
      ctx.beginPath();
      ctx.ellipse(hx - headR - 2.4, 0.4, 3.4, 2.0, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (hairStyle === 'asym_bob') {
      ctx.beginPath();
      ctx.arc(hx - 0.3, -0.3, headR * 0.98, Math.PI * 0.28, Math.PI * 1.68);
      ctx.fill();
    } else if (hairStyle === 'slick_part') {
      ctx.beginPath();
      ctx.arc(hx - 0.45, 0, headR * 0.95, Math.PI * 0.36, Math.PI * 1.64);
      ctx.fill();
      ctx.strokeStyle = profile.hairHighlight || '#475569';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(hx - 2.8, -1.6);
      ctx.lineTo(hx + 1.2, -1.6);
      ctx.stroke();
    } else if (hairStyle === 'long_hair') {
      ctx.beginPath();
      ctx.ellipse(hx - 1.4, 0, headR * 1.18, headR * 0.96, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Short crop / classic
      ctx.beginPath();
      ctx.arc(hx - 0.5, 0, headR * 0.95, Math.PI * 0.4, Math.PI * 1.6);
      ctx.fill();
    }

    // Valeria's glowing AR visor
    if (hat === 'visor') {
      ctx.strokeStyle = '#4de0b5';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(hx + 0.6, 0.8, headR * 0.96, -0.35, 1.15);
      ctx.stroke();
    }
  }

  function drawHumanoid(ctx, profile, anim, quality) {
    const highQ = quality !== false;
    const speed = anim.speed || 0;
    const isMoving = speed > 6;
    const isSprinting = Boolean(anim.isSprinting && speed > 175);
    const isPanicking = Boolean(anim.isPanicking);
    const walkPhase = anim.walkPhase || 0;
    const idlePhase = anim.idlePhase || 0;

    const breathe = isMoving ? 0 : Math.sin(idlePhase) * 0.45;
    const shoulderW = (profile.shoulderW || 16.5) + breathe;
    const torsoW = (profile.torsoDepth || 9.0) + (isSprinting ? 0.8 : 0);
    const headR = profile.headR || 4.8;

    const strideAmp = isSprinting ? 5.6 : isMoving ? 3.8 : 0;
    const armAmp = isSprinting ? 5.8 : isMoving ? 3.6 : Math.sin(idlePhase * 0.8) * 0.5;
    const swing = isMoving ? Math.sin(walkPhase) : 0;

    // 1. Directional drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(2.0, 2.6, torsoW * 0.65 + (isMoving ? 1.4 : 0), shoulderW * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Articulated Feet / Shoes
    const leftFootX = swing * strideAmp;
    const rightFootX = -swing * strideAmp;
    const footY = shoulderW * 0.23;

    ctx.fillStyle = profile.shoe || '#1b201d';
    drawRoundedCapsule(ctx, leftFootX + 0.8, -footY, 5.2, 3.1, 1.4);
    ctx.fill();
    drawRoundedCapsule(ctx, rightFootX + 0.8, footY, 5.2, 3.1, 1.4);
    ctx.fill();

    // 3. Articulated Arms & Hands
    const armOffsetY = shoulderW * 0.47;
    const leftHandX = isPanicking
      ? 3.8 + Math.sin(walkPhase * 1.4) * 1.8
      : -swing * armAmp + (isSprinting ? 1.4 : 0.4);
    const rightHandX = isPanicking
      ? 3.8 - Math.sin(walkPhase * 1.4) * 1.8
      : swing * armAmp + (isSprinting ? 1.4 : 0.4);
    const leftHandY = isPanicking ? -armOffsetY - 1.4 : -armOffsetY;
    const rightHandY = isPanicking ? armOffsetY + 1.4 : armOffsetY;

    // Sleeves / Forearms
    ctx.strokeStyle = profile.sleeve || profile.torsoPrimary;
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -armOffsetY + 0.8);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.moveTo(0, armOffsetY - 0.8);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    // Hands / Gloves
    ctx.fillStyle = profile.glove || profile.skin || SKIN_TONES.medium;
    ctx.beginPath();
    ctx.arc(leftHandX, leftHandY, 2.0, 0, Math.PI * 2);
    ctx.arc(rightHandX, rightHandY, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Backpack if pedestrian wears one
    if (profile.accessory === 'backpack') {
      ctx.fillStyle = profile.bagColor || '#3b4d5e';
      ctx.strokeStyle = '#121614';
      ctx.lineWidth = 1.0;
      drawRoundedCapsule(ctx, -torsoW * 0.56, 0, 4.4, shoulderW * 0.58, 1.8);
      ctx.fill();
      ctx.stroke();
    }

    // 5. Torso & Shoulders
    ctx.fillStyle = profile.torsoPrimary;
    drawRoundedCapsule(ctx, 0, 0, torsoW, shoulderW, 4.2);
    ctx.fill();

    if (highQ) {
      drawOutfitDetails(ctx, profile, torsoW, shoulderW);
    }

    // Crisp outer silhouette border for maximum legibility over asphalt & shadows
    ctx.strokeStyle = '#101511';
    ctx.lineWidth = 1.35;
    drawRoundedCapsule(ctx, 0, 0, torsoW, shoulderW, 4.2);
    ctx.stroke();

    // 6. Held Accessory (wrench, briefcase, scanner, clipboard, shopping bag, box, radio)
    if (highQ && profile.accessory && profile.accessory !== 'backpack') {
      drawAccessory(ctx, profile.accessory, rightHandX, rightHandY, leftHandX, leftHandY, anim.now);
    }

    // 7. Head & Hairstyle / Hat
    drawHeadAndHair(ctx, profile, headR);
  }

  function drawPlayerCharacter(ctx, player, quality) {
    if (!player) return;

    // Compute smooth interpolated position during vehicle enter/exit transition
    let drawX = player.x;
    let drawY = player.y;
    let scale = 1.0;
    if (player.enterExitAnim) {
      const a = player.enterExitAnim;
      const t = Math.max(0, Math.min(1, 1 - a.timer / a.duration));
      const ease = t * (2 - t);
      drawX = a.fromX + (a.toX - a.fromX) * ease;
      drawY = a.fromY + (a.toY - a.fromY) * ease;
      scale = a.entering ? 1 - ease * 0.22 : 0.78 + ease * 0.22;
    } else if (player.inCar) {
      return;
    }

    const angle = player.visualAngle !== undefined ? player.visualAngle : player.angle;

    ctx.save();
    ctx.translate(drawX, drawY);

    // Subtle protagonist ground ring so Mateo is always effortlessly readable in crowds
    ctx.strokeStyle = 'rgba(214, 243, 106, 0.34)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(0, 0, 12.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(angle);
    if (scale !== 1.0) ctx.scale(scale, scale);

    drawHumanoid(
      ctx,
      STORY_PROFILES.mateo,
      {
        speed: player.speed,
        isSprinting: player.speed > 185,
        walkPhase: player.walkPhase || 0,
        idlePhase: player.idlePhase || 0
      },
      quality
    );

    ctx.restore();
  }

  function drawStoryNPCCharacter(ctx, npc, isMissionTarget, isNearby, now, quality) {
    const profile = STORY_PROFILES[npc.id] || {
      shoulderW: 16.5,
      torsoDepth: 9.0,
      headR: 4.8,
      skin: SKIN_TONES.medium,
      torsoPrimary: npc.shirt || '#f5d94b',
      torsoSecondary: '#222824',
      accent: npc.color || '#f5d94b',
      hairColor: npc.hair || '#222',
      hairStyle: 'short_crop',
      outfitStyle: 'casual_jacket'
    };

    const angle = npc.visualAngle !== undefined ? npc.visualAngle : (npc.angle || Math.PI / 2);
    const ringR = (isMissionTarget ? 18 : 15.5) + Math.sin((now || 0) / 240) * 2.2;

    ctx.save();

    // Ground beacon ring
    ctx.strokeStyle = isMissionTarget ? '#f5d94b' : (npc.color || '#6cb2d1');
    ctx.lineWidth = isMissionTarget ? 2.1 : 1.35;
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Draw articulated NPC character
    ctx.save();
    ctx.translate(npc.x, npc.y);
    ctx.rotate(angle);
    drawHumanoid(
      ctx,
      profile,
      {
        speed: 0,
        walkPhase: 0,
        idlePhase: npc.idlePhase || 0,
        now
      },
      quality
    );
    ctx.restore();

    // Clean overhead nameplate + interaction prompt
    const shortName = npc.name.split(' ')[0];
    const tagText = isMissionTarget
      ? `! ${shortName.toUpperCase()}`
      : isNearby
        ? `💬 ${shortName.toUpperCase()}`
        : shortName.toUpperCase();

    ctx.font = 'bold 9.5px monospace';
    ctx.textAlign = 'center';
    const textW = Math.max(54, ctx.measureText(tagText).width + 12);
    const boxY = npc.y - 31;

    ctx.fillStyle = 'rgba(11, 17, 13, 0.88)';
    ctx.fillRect(npc.x - textW * 0.5, boxY, textW, 13.5);
    ctx.strokeStyle = isMissionTarget ? '#f5d94b' : isNearby ? '#6cb2d1' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(npc.x - textW * 0.5, boxY, textW, 13.5);

    ctx.fillStyle = isMissionTarget ? '#f5d94b' : isNearby ? '#8ad8f8' : '#eaf2e8';
    ctx.fillText(tagText, npc.x, boxY + 10);

    ctx.restore();
  }

  function drawPedestrianCharacter(ctx, p, now, quality) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // Knocked-down articulated state
    if (p.knockTimer > 0) {
      ctx.rotate(p.visualAngle || p.angle || 0);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(1.5, 2.5, 11, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outstretched legs
      ctx.fillStyle = p.pantsColor || '#263038';
      ctx.fillRect(-10, -3.5, 6, 2.6);
      ctx.fillRect(-10, 0.9, 6, 2.6);

      // Torso
      ctx.fillStyle = p.shirt;
      drawRoundedCapsule(ctx, -1.5, 0, 11, 8.2, 3);
      ctx.fill();
      ctx.strokeStyle = '#111612';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Head
      ctx.fillStyle = p.skin || SKIN_TONES.medium;
      ctx.beginPath();
      ctx.arc(6.2, 0, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.arc(5.6, 0, 4.1, Math.PI * 0.4, Math.PI * 1.6);
      ctx.fill();

      ctx.restore();
      return;
    }

    const angle = p.visualAngle !== undefined ? p.visualAngle : p.angle;
    const isPanicking = p.panicTimer > 0;
    const effectiveSpeed = p.pausedTimer > 0 ? 0 : (isPanicking ? p.speed * 1.75 : p.speed);

    ctx.save();
    ctx.rotate(angle);

    const profile = p.visualProfile || {
      shoulderW: p.shoulderW || 15.5,
      torsoDepth: p.torsoDepth || 8.4,
      headR: 4.5,
      skin: p.skin || SKIN_TONES.medium,
      torsoPrimary: p.shirt,
      torsoSecondary: p.shirtSecondary || 'rgba(0,0,0,0.22)',
      accent: p.accent || '#f5d94b',
      trim: '#ffffff',
      sleeve: p.shirt,
      glove: p.skin || SKIN_TONES.medium,
      shoe: p.shoeColor || '#1e2420',
      hairColor: p.hair,
      hairStyle: p.hairStyle || 'short_crop',
      outfitStyle: p.outfitStyle || 'casual_jacket',
      hatType: p.hatType || 'none',
      hatColor: p.hatColor || '#facc15',
      accessory: p.accessory || (p.hasBag ? 'shopping_bag' : 'none'),
      bagColor: p.bagColor || '#3b4d5e'
    };

    drawHumanoid(
      ctx,
      profile,
      {
        speed: effectiveSpeed,
        isSprinting: isPanicking,
        isPanicking,
        walkPhase: p.walkPhase || 0,
        idlePhase: p.idlePhase || 0,
        now
      },
      quality
    );

    ctx.restore();

    // Alert exclamation badge when startled by vehicle or horn
    if (p.alertIconTimer > 0) {
      const bob = Math.sin((now || 0) / 70) * 1.5;
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(0, -16 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -13 + bob);
    }

    ctx.restore();
  }

  // Draws occupant shoulders + head visible inside vehicle cabin/windshield
  function drawVehicleOccupant(ctx, v, isPlayerDriver) {
    if (!isPlayerDriver && !v.isPolice && !v.isChaseTarget) return;

    let profile = STORY_PROFILES.mateo;
    if (!isPlayerDriver) {
      if (v.isChaseTarget && v.typeId === 'police_enforcer') {
        profile = STORY_PROFILES.davila;
      } else if (v.isPolice) {
        profile = STORY_PROFILES.police_foot;
      } else {
        return;
      }
    }

    const seatX = v.typeId === 'truck' ? v.length * 0.28 : v.length * 0.08;
    const seatY = -v.width * 0.16;

    ctx.save();
    ctx.translate(seatX, seatY);
    ctx.scale(0.76, 0.76);

    // Compact shoulders inside cabin
    ctx.fillStyle = profile.torsoPrimary;
    drawRoundedCapsule(ctx, -1.5, 0, 7.5, 13.5, 3);
    ctx.fill();

    if (profile.accent) {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-2.5, -5.8, 3.2, 1.6);
      ctx.fillRect(-2.5, 4.2, 3.2, 1.6);
    }

    // Head & hair/cap visible through glass
    drawHeadAndHair(ctx, profile, 4.4);
    ctx.restore();
  }

  // Stylized vector portraits for Dialogue Box & Character Archive
  function getPortraitSVG(charId, size = 46) {
    const p = STORY_PROFILES[charId] || STORY_PROFILES.mateo;
    const bg = '#151f18';
    const accent = p.accent || '#d6f36a';
    const skin = p.skin || '#dfb08a';
    const hair = p.hairColor || '#1c201d';
    const jacket = p.torsoPrimary || '#243327';

    let headgearSVG = '';
    if (p.hatType === 'police_cap' || p.hatType === 'dock_cap') {
      const capCol = p.hatType === 'police_cap' ? '#14202e' : '#243647';
      const badgeCol = p.hatType === 'police_cap' ? '#e2e8f0' : '#f5d94b';
      headgearSVG = `
        <path d="M13 18 Q24 9 35 18 L33 21 L15 21 Z" fill="${capCol}" stroke="#0b0f14" stroke-width="1.2"/>
        <rect x="14" y="20" width="20" height="2.8" rx="1.2" fill="#0d1117"/>
        <circle cx="24" cy="16.5" r="2" fill="${badgeCol}"/>
      `;
    } else if (p.hairStyle === 'bun') {
      headgearSVG = `
        <circle cx="24" cy="10" r="4.5" fill="${hair}"/>
        <path d="M15 21 Q15 12 24 12 Q33 12 33 21 Q29 17 24 17 Q19 17 15 21 Z" fill="${hair}"/>
      `;
    } else if (p.hairStyle === 'ponytail') {
      headgearSVG = `
        <path d="M31 15 Q39 18 37 29 Q34 26 32 21 Z" fill="${hair}"/>
        <path d="M15 21 Q15 11 24 11 Q33 11 33 21 Q28 16 24 17 Q19 16 15 21 Z" fill="${hair}"/>
      `;
    } else if (p.hairStyle === 'asym_bob') {
      headgearSVG = `
        <path d="M14 24 Q14 11 24 11 Q34 11 34 22 L31 25 Q29 17 23 17 Q17 18 16 26 Z" fill="${hair}"/>
        <rect x="24" y="19" width="9" height="2.6" rx="1.2" fill="#4de0b5" opacity="0.9"/>
      `;
    } else {
      headgearSVG = `
        <path d="M15 21 Q15 11 24 11 Q33 11 33 21 Q28 16.5 24 16.5 Q19 16.5 15 21 Z" fill="${hair}"/>
      `;
    }

    return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="7" fill="${bg}"/>
      <circle cx="24" cy="24" r="21" fill="none" stroke="${accent}" stroke-opacity="0.22" stroke-width="1.2"/>
      <!-- Shoulders & Jacket -->
      <path d="M8 46 Q10 33 24 33 Q38 33 40 46 Z" fill="${jacket}" stroke="#0f1410" stroke-width="1.3"/>
      <path d="M18 33 L24 41 L30 33" fill="none" stroke="${accent}" stroke-width="2"/>
      <!-- Neck -->
      <rect x="20.5" y="27" width="7" height="7" rx="2.5" fill="${skin}"/>
      <!-- Head -->
      <ellipse cx="24" cy="21.5" rx="8.5" ry="9.5" fill="${skin}" stroke="#121613" stroke-width="1.2"/>
      <!-- Eyes & Brow -->
      <line x1="18.5" y1="19.8" x2="22" y2="20.2" stroke="#181c19" stroke-width="1.4" stroke-linecap="round"/>
      <line x1="26" y1="20.2" x2="29.5" y2="19.8" stroke="#181c19" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="20.5" cy="22" r="1.15" fill="#141815"/>
      <circle cx="27.5" cy="22" r="1.15" fill="#141815"/>
      <path d="M21.5 26.5 Q24 27.6 26.5 26.5" fill="none" stroke="#6e4730" stroke-width="1.2" stroke-linecap="round"/>
      ${headgearSVG}
    </svg>`;
  }

  return {
    SKIN_TONES,
    STORY_PROFILES,
    updateVisuals,
    drawPlayerCharacter,
    drawStoryNPCCharacter,
    drawPedestrianCharacter,
    drawVehicleOccupant,
    getPortraitSVG
  };
})();
