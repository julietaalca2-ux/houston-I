window.CiudadCero = window.CiudadCero || {};

CiudadCero.Garage = (() => {
  const Config = CiudadCero.Config;
  const rules = Config.GARAGE_RULES;

  let slots = [];
  let nextSlotId = 1;

  function makeSlotFromVehicle(v, stored = true) {
    return {
      slotId: nextSlotId++,
      worldVehicleId: stored ? null : v.id,
      typeId: v.typeId,
      name: v.name,
      color: v.color,
      hp: Math.round(v.hp),
      maxHp: Math.round(v.maxHp),
      isPolice: Boolean(v.isPolice),
      stored
    };
  }

  function init(starterVehicle) {
    slots = [];
    nextSlotId = 1;
    if (starterVehicle) {
      starterVehicle.isPlayerOwned = true;
      slots.push(makeSlotFromVehicle(starterVehicle, false));
    }
  }

  function syncWorldVehicle(v) {
    if (!v) return;
    const existing = slots.find((s) => s.worldVehicleId === v.id);
    if (existing) {
      existing.hp = Math.round(v.hp);
      existing.maxHp = Math.round(v.maxHp);
      existing.color = v.color;
    }
  }

  function getSlots() {
    return slots.map((s) => Object.assign({}, s));
  }

  function getMaxSlots() {
    return rules.maxSlots;
  }

  function storeVehicle(vehicle, vehicles, player, onPlayerExited) {
    if (!vehicle) {
      return { ok: false, msg: 'No hay ningún vehículo para guardar.' };
    }
    if (vehicle.isMissionTarget) {
      return { ok: false, msg: 'Entrega primero este vehículo de misión.' };
    }

    const existing = slots.find((s) => s.worldVehicleId === vehicle.id);
    if (!existing && slots.length >= rules.maxSlots) {
      return { ok: false, msg: `Garaje lleno (${rules.maxSlots}/${rules.maxSlots} espacios).` };
    }

    if (existing) {
      existing.hp = Math.round(vehicle.hp);
      existing.maxHp = Math.round(vehicle.maxHp);
      existing.stored = true;
      existing.worldVehicleId = null;
    } else {
      slots.push(makeSlotFromVehicle(vehicle, true));
    }

    if (player && player.inCar && player.vehicle === vehicle) {
      player.inCar = false;
      player.vehicle = null;
      if (typeof onPlayerExited === 'function') onPlayerExited();
    }

    const idx = vehicles.indexOf(vehicle);
    if (idx !== -1) {
      vehicles.splice(idx, 1);
    }

    CiudadCero.Audio.playGarageAction();
    return { ok: true, msg: `${vehicle.name} guardado en el garaje.` };
  }

  function spawnFromSlot(slot, garageObj, player, vehicles) {
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const other = vehicles[i];
      if (Math.hypot(other.x - garageObj.spawnX, other.y - garageObj.spawnY) < 42) {
        if (other.isPlayerOwned) {
          const otherSlot = slots.find((s) => s.worldVehicleId === other.id);
          if (otherSlot) {
            otherSlot.stored = true;
            otherSlot.worldVehicleId = null;
            otherSlot.hp = Math.round(other.hp);
          }
          vehicles.splice(i, 1);
        } else {
          other.x += 55;
        }
      }
    }

    const spawned = CiudadCero.Entities.createVehicle({
      typeId: slot.typeId,
      color: slot.color,
      x: garageObj.spawnX,
      y: garageObj.spawnY,
      angle: garageObj.spawnAngle || -Math.PI / 2,
      hp: slot.hp,
      isPlayerOwned: true,
      isAI: false,
      isParked: false
    });

    vehicles.push(spawned);
    slot.stored = false;
    slot.worldVehicleId = spawned.id;

    if (player) {
      player.inCar = true;
      player.vehicle = spawned;
      player.x = spawned.x;
      player.y = spawned.y;
      player.angle = spawned.angle;
    }

    CiudadCero.Audio.playGarageAction();
    return spawned;
  }

  function selectVehicle(slotId, garageObj, player, vehicles) {
    const slot = slots.find((s) => s.slotId === slotId);
    if (!slot) return { ok: false, msg: 'Vehículo no encontrado.' };

    if (!slot.stored && slot.worldVehicleId) {
      const activeVeh = vehicles.find((v) => v.id === slot.worldVehicleId);
      if (activeVeh) {
        if (Math.hypot(activeVeh.x - garageObj.x, activeVeh.y - garageObj.y) < 95) {
          player.inCar = true;
          player.vehicle = activeVeh;
          player.x = activeVeh.x;
          player.y = activeVeh.y;
          CiudadCero.Audio.playGarageAction();
          return { ok: true, msg: `Subiste a ${slot.name}.` };
        }
        return { ok: false, msg: 'El vehículo está en la calle. Usa RECUPERAR.' };
      }
      slot.stored = true;
      slot.worldVehicleId = null;
    }

    if (player && player.inCar && player.vehicle && player.vehicle.id !== slot.worldVehicleId) {
      const currentVeh = player.vehicle;
      const alreadyOwned = slots.find((s) => s.worldVehicleId === currentVeh.id);
      if (alreadyOwned) {
        alreadyOwned.stored = true;
        alreadyOwned.worldVehicleId = null;
        alreadyOwned.hp = Math.round(currentVeh.hp);
        const idx = vehicles.indexOf(currentVeh);
        if (idx !== -1) vehicles.splice(idx, 1);
      } else if (slots.length < rules.maxSlots) {
        slots.push(makeSlotFromVehicle(currentVeh, true));
        const idx = vehicles.indexOf(currentVeh);
        if (idx !== -1) vehicles.splice(idx, 1);
      }
    }

    spawnFromSlot(slot, garageObj, player, vehicles);
    return { ok: true, msg: `${slot.name} listo para conducir.` };
  }

  function recoverVehicle(slotId, garageObj, player, vehicles, money, spendFn) {
    const slot = slots.find((s) => s.slotId === slotId);
    if (!slot) return { ok: false, msg: 'Vehículo no encontrado.' };

    const cost = rules.recoverCost;
    if (money < cost) {
      return { ok: false, msg: `Necesitas $ ${cost} para recuperar el vehículo.` };
    }

    if (slot.worldVehicleId) {
      const idx = vehicles.findIndex((v) => v.id === slot.worldVehicleId);
      if (idx !== -1) {
        if (player && player.vehicle === vehicles[idx]) {
          player.inCar = false;
          player.vehicle = null;
        }
        vehicles.splice(idx, 1);
      }
      slot.worldVehicleId = null;
    }

    spendFn(cost);
    slot.stored = true;
    spawnFromSlot(slot, garageObj, player, vehicles);
    return { ok: true, msg: `${slot.name} recuperado al garaje (-$ ${cost}).` };
  }

  function repairActiveVehicle(vehicle, money, spendFn) {
    if (!vehicle) return { ok: false, msg: 'No hay vehículo en la bahía.' };
    if (vehicle.hp >= vehicle.maxHp - 1) {
      return { ok: false, msg: 'El vehículo ya está en perfecto estado.' };
    }
    const cost = rules.repairCost;
    if (money < cost) {
      return { ok: false, msg: `Necesitas $ ${cost} para reparar.` };
    }
    spendFn(cost);
    vehicle.hp = vehicle.maxHp;
    syncWorldVehicle(vehicle);
    CiudadCero.Audio.playGarageAction();
    return { ok: true, msg: `${vehicle.name} reparado al 100% (-$ ${cost}).` };
  }

  function repairSlotVehicle(slotId, vehicles, money, spendFn) {
    const slot = slots.find((s) => s.slotId === slotId);
    if (!slot) return { ok: false, msg: 'Vehículo no encontrado.' };
    if (slot.hp >= slot.maxHp - 1) {
      return { ok: false, msg: 'El vehículo ya está reparado.' };
    }
    const cost = rules.repairCost;
    if (money < cost) {
      return { ok: false, msg: `Necesitas $ ${cost} para reparar.` };
    }
    spendFn(cost);
    slot.hp = slot.maxHp;
    if (slot.worldVehicleId) {
      const v = vehicles.find((item) => item.id === slot.worldVehicleId);
      if (v) v.hp = v.maxHp;
    }
    CiudadCero.Audio.playGarageAction();
    return { ok: true, msg: `${slot.name} reparado al 100% (-$ ${cost}).` };
  }

  return {
    init,
    syncWorldVehicle,
    getSlots,
    getMaxSlots,
    storeVehicle,
    selectVehicle,
    recoverVehicle,
    repairActiveVehicle,
    repairSlotVehicle
  };
})();
