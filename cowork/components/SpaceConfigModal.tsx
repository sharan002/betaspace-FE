import React, { useState } from 'react';
import { X, Building2, Armchair, Plus, Trash2, CheckCircle2, Monitor, Users, Briefcase } from 'lucide-react';
import { CoworkingSpace, MeetingRoom, PrivateOffice, Seat } from '../types';
import { formatINR } from '../utils/storage';
import { DEFAULT_AREAS } from '../data/initialData';

interface SpaceConfigModalProps {
  onClose: () => void;
  onSaveSpace: (space: CoworkingSpace) => void;
  existingSpace?: CoworkingSpace;
  knownAreas?: string[];
}

const ADD_NEW_AREA = '__add_new_area__';

export const SpaceConfigModal: React.FC<SpaceConfigModalProps> = ({
  onClose,
  onSaveSpace,
  existingSpace,
  knownAreas = DEFAULT_AREAS,
}) => {
  const [name, setName] = useState(existingSpace?.name || '');
  const [areaChoice, setAreaChoice] = useState<string>(existingSpace?.branchArea || knownAreas[0] || 'Ram Nagar');
  const [newArea, setNewArea] = useState('');
  const isAddingArea = areaChoice === ADD_NEW_AREA;
  const branchArea = isAddingArea ? newArea.trim() : areaChoice;
  const [address, setAddress] = useState(existingSpace?.address || '');
  const [pincode, setPincode] = useState(existingSpace?.pincode || '641009');
  const [phone, setPhone] = useState(existingSpace?.phone || '+91 98422 12345');
  const [screenLabel, setScreenLabel] = useState(
    existingSpace?.screenLabel || 'FRONT PRESENTATION STAGE & PROJECTION SCREEN'
  );

  // Configuration for Hotdesks ("Fixed and static place where it will not change often")
  const [hotDeskCount, setHotDeskCount] = useState<number>(8);
  const [hotDeskPrice, setHotDeskPrice] = useState<number>(95);

  // Configuration for Co-Working Flex Desks ("will change")
  const [coworkRowsCount, setCoworkRowsCount] = useState<number>(3);
  const [coworkSeatsPerRow, setCoworkSeatsPerRow] = useState<number>(8);
  const [coworkPrice, setCoworkPrice] = useState<number>(60);

  // Configuration for Meeting Rooms ("Meeting room based on time slot")
  const [meetingRooms, setMeetingRooms] = useState<
    Array<{ id: string; name: string; capacity: number; pricePerHour: number; equipment: string }>
  >(
    existingSpace?.meetingRooms.map((mr) => ({
      id: mr.id,
      name: mr.name,
      capacity: mr.capacity,
      pricePerHour: mr.pricePerHour,
      equipment: mr.equipment.join(', '),
    })) || [
      {
        id: 'mr-new-1',
        name: 'Conference Room 1',
        capacity: 8,
        pricePerHour: 650,
        equipment: '75" 4K Smart Display, Video Cam, Glass Whiteboard',
      },
    ]
  );

  // Configuration for Private Offices ("Office inside office one office shared by 2 or many people")
  const [privateOffices, setPrivateOffices] = useState<
    Array<{ id: string; name: string; capacity: number; pricePerHour: number; monthlyRent: number }>
  >(
    existingSpace?.privateOffices.map((po) => ({
      id: po.id,
      name: po.name,
      capacity: po.capacity,
      pricePerHour: po.pricePerHour,
      monthlyRent: po.monthlyRent,
    })) || [
      {
        id: 'po-new-1',
        name: 'Private Suite 101',
        capacity: 4,
        pricePerHour: 450,
        monthlyRent: 28000,
      },
    ]
  );

  const [errorMsg, setErrorMsg] = useState('');

  const handleAddMeetingRoom = () => {
    const nextNum = meetingRooms.length + 1;
    setMeetingRooms((prev) => [
      ...prev,
      {
        id: `mr-new-${Date.now()}-${nextNum}`,
        name: `Discussion Pod ${nextNum}`,
        capacity: 6,
        pricePerHour: 450,
        equipment: '55" 4K Screen, Conference Mic',
      },
    ]);
  };

  const handleAddPrivateOffice = () => {
    const nextNum = privateOffices.length + 1;
    setPrivateOffices((prev) => [
      ...prev,
      {
        id: `po-new-${Date.now()}-${nextNum}`,
        name: `Private Suite ${nextNum}`,
        capacity: 4,
        pricePerHour: 400,
        monthlyRent: 24000,
      },
    ]);
  };

  // Live total calculation
  const totalMeetingSeats = meetingRooms.reduce((acc, r) => acc + r.capacity, 0);
  const totalPrivateOfficeSeats = privateOffices.reduce((acc, po) => acc + po.capacity, 0);
  const totalCoworkFlexSeats = coworkRowsCount * coworkSeatsPerRow;
  const totalSeats = totalMeetingSeats + totalPrivateOfficeSeats + hotDeskCount + totalCoworkFlexSeats;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please specify the space name');
      return;
    }
    if (!branchArea) {
      setErrorMsg('Please enter the new area name');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please specify the address');
      return;
    }

    const spaceId = existingSpace ? existingSpace.id : `cbe-space-${Date.now()}`;
    const generatedSeats: Seat[] = [];
    const generatedMeetingRooms: MeetingRoom[] = [];
    const generatedPrivateOffices: PrivateOffice[] = [];

    // 1. Meeting Rooms
    meetingRooms.forEach((mr, mrIdx) => {
      const roomSeatIds: string[] = [];
      const prefix = `MR${mrIdx + 1}`;
      for (let i = 1; i <= mr.capacity; i++) {
        const seatId = `${prefix}-${i}`;
        roomSeatIds.push(seatId);
        generatedSeats.push({
          id: seatId,
          row: prefix,
          number: i,
          category: 'meeting_room',
          name: `${mr.name} - Chair ${i}`,
          pricePerHour: Math.round(mr.pricePerHour / mr.capacity) || 80,
          pricePerDay: Math.round((mr.pricePerHour / mr.capacity) * 6) || 480,
          amenities: ['Conference Table Seat', 'Ergonomic Chair', 'Acoustic Room Access'],
          meetingRoomId: mr.id,
        });
      }

      generatedMeetingRooms.push({
        id: mr.id,
        name: mr.name,
        capacity: mr.capacity,
        seatIds: roomSeatIds,
        pricePerHour: mr.pricePerHour,
        equipment: mr.equipment.split(',').map((s) => s.trim()).filter(Boolean),
      });
    });

    // 2. Private Offices (Office inside office shared by 2 or more people)
    privateOffices.forEach((po, poIdx) => {
      const poSeatIds: string[] = [];
      const prefix = `PO${poIdx + 1}`;
      for (let i = 1; i <= po.capacity; i++) {
        const seatId = `${prefix}-${i}`;
        poSeatIds.push(seatId);
        generatedSeats.push({
          id: seatId,
          row: prefix,
          number: i,
          category: 'private_office',
          name: `${po.name} - Desk ${i}`,
          pricePerHour: Math.round(po.pricePerHour / po.capacity) || 100,
          pricePerDay: Math.round((po.pricePerHour / po.capacity) * 6) || 600,
          amenities: ['Lockable Cabin Chair', 'Under-desk Storage'],
          privateOfficeId: po.id,
        });
      }

      generatedPrivateOffices.push({
        id: po.id,
        name: po.name,
        capacity: po.capacity,
        seatIds: poSeatIds,
        pricePerHour: po.pricePerHour,
        monthlyRent: po.monthlyRent,
        features: [`Office inside office shared by ${po.capacity} people`, 'Lockable Door'],
      });
    });

    // 3. Hotdesk (Fixed and static place)
    for (let h = 1; h <= hotDeskCount; h++) {
      const seatId = `HD-${h}`;
      generatedSeats.push({
        id: seatId,
        row: 'HD',
        number: h,
        category: 'hotdesk',
        name: `Fixed Static Desk HD${h}`,
        pricePerHour: hotDeskPrice,
        pricePerDay: hotDeskPrice * 6,
        amenities: ['Fixed Dedicated Desk', 'Nameplate Holder', 'Personal Lockable Pedestal'],
      });
    }

    // 4. Co-Working Flex Desks (will change)
    const rowLetters = ['A', 'B', 'C', 'D', 'E'];
    for (let r = 0; r < coworkRowsCount; r++) {
      const rowLetter = rowLetters[r] || `R${r + 1}`;
      for (let s = 1; s <= coworkSeatsPerRow; s++) {
        const seatId = `CW-${rowLetter}${s}`;
        generatedSeats.push({
          id: seatId,
          row: rowLetter,
          number: s,
          category: 'co_working',
          name: `Co-Working Flex ${rowLetter}${s}`,
          pricePerHour: coworkPrice,
          pricePerDay: coworkPrice * 6,
          amenities: ['Flex Chair', 'Fast Wi-Fi', 'Power Outlet'],
        });
      }
    }

    const newSpace: CoworkingSpace = {
      id: spaceId,
      name: name.trim(),
      branchArea,
      tagline: existingSpace?.tagline || `Modern Co-Working Hub in ${branchArea}, Coimbatore`,
      address: address.trim(),
      city: 'Coimbatore, Tamil Nadu',
      pincode: pincode.trim(),
      phone: phone.trim(),
      screenLabel: screenLabel.trim(),
      openHours: existingSpace?.openHours || { open: '08:00', close: '22:00' },
      amenities: existingSpace?.amenities || [
        '500 Mbps High-Speed Fiber',
        'Filter Coffee & Tea Bar',
        '100% DG Generator Backup',
        'Parcel Receiving Desk',
      ],
      meetingRooms: generatedMeetingRooms,
      privateOffices: generatedPrivateOffices,
      seats: generatedSeats,
      virtualOfficePlans: existingSpace?.virtualOfficePlans || [
        {
          id: `vo-${spaceId}`,
          name: `${branchArea} Parcel Box & Business Address`,
          tagline: 'Receive parcels and register your business in Coimbatore',
          pricePerMonth: 1499,
          features: ['Official Coimbatore address', 'Courier parcel receiving', 'WhatsApp notification'],
          parcelHandlingNotes: 'Received at front desk with safe storage',
        },
      ],
      managedOffices: existingSpace?.managedOffices || [
        {
          id: `mo-${spaceId}`,
          name: `Managed Enterprise Floor - ${branchArea}`,
          companyCapacity: 25,
          dedicatedFloorArea: '1,500 sq.ft private wing',
          monthlyRate: 70000,
          features: ['Exclusively managed for one corporate team', 'Dedicated manager cabin & pantry'],
          status: 'available',
        },
      ],
    };

    onSaveSpace(newSpace);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {existingSpace ? 'Edit Coimbatore Co-Working Hub' : 'Add New Coimbatore Co-Working Hub'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure Coimbatore area, meeting rooms, private offices, and static hotdesks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-slate-800">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Basic Coimbatore Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Location & Coimbatore Area
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hub Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CoWork Prime - Ram Nagar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coimbatore Area <span className="text-rose-600">*</span>
                </label>
                <select
                  value={areaChoice}
                  onChange={(e) => setAreaChoice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {Array.from(new Set([...knownAreas, ...(existingSpace?.branchArea ? [existingSpace.branchArea] : [])])).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  <option value={ADD_NEW_AREA}>+ Add new area…</option>
                </select>
                {isAddingArea && (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter new Coimbatore area, e.g. Saravanampatti"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="mt-2 w-full bg-white border border-sky-400 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address in Coimbatore <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. No. 42, 2nd Cross Cut Road, Ram Nagar"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 1. Meeting Rooms (Time Slot Based) */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Meeting Rooms (Slot Based)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Conference room with AV hardware reserved by time slots
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddMeetingRoom}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Meeting Room</span>
              </button>
            </div>

            <div className="space-y-3">
              {meetingRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 w-full">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 block uppercase font-bold">Room Name</label>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMeetingRooms((prev) =>
                            prev.map((r) => (r.id === room.id ? { ...r, name: val } : r))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold">Chairs</label>
                      <input
                        type="number"
                        min="2"
                        max="20"
                        value={room.capacity}
                        onChange={(e) => {
                          const val = Math.max(2, parseInt(e.target.value, 10) || 2);
                          setMeetingRooms((prev) =>
                            prev.map((r) => (r.id === room.id ? { ...r, capacity: val } : r))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold">Rate (₹/hr)</label>
                      <input
                        type="number"
                        min="100"
                        value={room.pricePerHour}
                        onChange={(e) => {
                          const val = Math.max(100, parseInt(e.target.value, 10) || 100);
                          setMeetingRooms((prev) =>
                            prev.map((r) => (r.id === room.id ? { ...r, pricePerHour: val } : r))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  {meetingRooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMeetingRooms((prev) => prev.filter((r) => r.id !== room.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Private Offices ("Office inside office one office shared by 2 or many people") */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  Private Offices (Office inside office - Shared by 2 or more people)
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddPrivateOffice}
                className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Private Cabin</span>
              </button>
            </div>

            <div className="space-y-3">
              {privateOffices.map((office) => (
                <div
                  key={office.id}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 w-full">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 block uppercase font-bold">Cabin Name</label>
                      <input
                        type="text"
                        value={office.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrivateOffices((prev) =>
                            prev.map((po) => (po.id === office.id ? { ...po, name: val } : po))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold">People Capacity</label>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={office.capacity}
                        onChange={(e) => {
                          const val = Math.max(2, parseInt(e.target.value, 10) || 2);
                          setPrivateOffices((prev) =>
                            prev.map((po) => (po.id === office.id ? { ...po, capacity: val } : po))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block uppercase font-bold">Monthly Rent (₹)</label>
                      <input
                        type="number"
                        min="5000"
                        value={office.monthlyRent}
                        onChange={(e) => {
                          const val = Math.max(5000, parseInt(e.target.value, 10) || 5000);
                          setPrivateOffices((prev) =>
                            prev.map((po) => (po.id === office.id ? { ...po, monthlyRent: val } : po))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  {privateOffices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPrivateOffices((prev) => prev.filter((po) => po.id !== office.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Hotdesk & Co-Working */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            {/* Hotdesk: Fixed and static */}
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-3">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Hotdesk (Fixed & Static Place)
              </h4>
              <p className="text-[11px] text-slate-500">Will not change often</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">No. of Desks</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={hotDeskCount}
                    onChange={(e) => setHotDeskCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Rate (₹/hr)</label>
                  <input
                    type="number"
                    min="50"
                    value={hotDeskPrice}
                    onChange={(e) => setHotDeskPrice(Math.max(50, parseInt(e.target.value, 10) || 50))}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Co-working: Flex seats (will change) */}
            <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-200 space-y-3">
              <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                Co-Working (Flex Chairs - Will Change)
              </h4>
              <p className="text-[11px] text-slate-500">Theater cinema style rows</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Rows</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={coworkRowsCount}
                    onChange={(e) => setCoworkRowsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Seats/Row</label>
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={coworkSeatsPerRow}
                    onChange={(e) => setCoworkSeatsPerRow(Math.max(2, parseInt(e.target.value, 10) || 2))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Rate (₹/hr)</label>
                  <input
                    type="number"
                    min="30"
                    value={coworkPrice}
                    onChange={(e) => setCoworkPrice(Math.max(30, parseInt(e.target.value, 10) || 30))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Capacity Summary Bar */}
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">
                Total Seating Capacity
              </span>
              <div className="text-sm text-slate-700 font-medium">
                <span className="font-bold text-slate-900 font-mono text-base">{totalSeats}</span> Total Seats:{' '}
                <span className="text-indigo-700">{totalMeetingSeats} Meeting</span> ·{' '}
                <span className="text-purple-700">{totalPrivateOfficeSeats} Private Cabin</span> ·{' '}
                <span className="text-amber-700">{hotDeskCount} Static Hotdesks</span> ·{' '}
                <span className="text-sky-700">{totalCoworkFlexSeats} Flex</span>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{existingSpace ? 'Save Coimbatore Hub' : 'Create Coimbatore Hub'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
