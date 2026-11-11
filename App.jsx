import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowRight, AudioLines,
  Barcode, BatteryCharging, Bell, BookOpen, Boxes, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleHelp, ClipboardCheck, Clock3, Cloud, Copy, Cpu, Download,
  ExternalLink, Factory, FileBarChart, FileText, Gauge, HardDrive, Headphones,
  Info, Layers3, LayoutDashboard, Lightbulb, Link2, ListChecks, LockKeyhole,
  Maximize2, Moon, MoreHorizontal, Package, PackageCheck, Pause, Play, Radio,
  RefreshCw, RotateCcw, ScanLine, Server, Settings2, ShieldCheck, Signal,
  Smartphone, Sparkles, Sun, Truck, Upload, Wifi, WifiOff, X, Zap,
} from 'lucide-react';

const OPERATIONS = [
  { id: 'receive', number: '01', name: 'Mal Kabul', short: 'Kabul', icon: PackageCheck, duration: '04:20', area: 'Rampa A-01', detail: 'Yurt dışından gelen tır yanaşır. Konşimento, ÖTF ve irsaliye doğrulanır; ürün ve palet etiketleri kabul noktasında eşleştirilir.', checkpoint: 'Evrak + barkod doğrulaması', output: 'Kabul edilmiş palet / ASN kaydı' },
  { id: 'putaway', number: '02', name: 'Raflama', short: 'Raflama', icon: Layers3, duration: '06:10', area: 'Drive-In / D-04', detail: 'Turret Truck, WMS tarafından atanan koridora ilerler; yükü Drive-In kanalına 90° dönüşle güvenli şekilde yerleştirir.', checkpoint: 'Adres ve ürün SKU eşleşmesi', output: 'Doğrulanmış raf adresi' },
  { id: 'storage', number: '03', name: 'Depolama', short: 'Depolama', icon: Boxes, duration: '12:00', area: 'Blok D / Seviye 02', detail: 'Beyaz eşya ürünleri dış etkenlerden korunan, adres bazlı ve izlenebilir stok alanında tutulur. FIFO/FEFO kuralı ürün tipine göre uygulanır.', checkpoint: 'Stok doğruluğu + ortam kontrolü', output: 'Canlı envanter görünürlüğü' },
  { id: 'replenish', number: '04', name: 'İkmal', short: 'İkmal', icon: ArrowDownToLine, duration: '03:40', area: 'Pick-face / P-02', detail: 'Üst seviyedeki yedek palet, alt toplama gözü minimum stok eşiğine düştüğünde dikey transferle aşağı indirilir.', checkpoint: 'Min / max stok eşiği', output: 'Toplama alanında kesintisiz stok' },
  { id: 'pick', number: '05', name: 'Sipariş Toplama', short: 'Toplama', icon: ClipboardCheck, duration: '05:50', area: 'Toplama hattı / P-02', detail: 'Bayi siparişleri dalga bazlı oluşturulur. Operatör/otonom ekipman doğru SKU, seri ve miktarı barkodla doğrulayarak toplar.', checkpoint: 'Sipariş satırı + seri no eşleşmesi', output: 'Eksiksiz bayi siparişi' },
  { id: 'ship', number: '06', name: 'Paketleme & Sevkiyat', short: 'Sevkiyat', icon: Truck, duration: '07:30', area: 'Sevkiyat / Rampa B-03', detail: 'Ürün döner platformda streçlenir; irsaliye kesilir, yükleme sırası optimize edilir ve bayi tırına sevk edilir.', checkpoint: 'Paket / irsaliye / yükleme kontrolü', output: 'Sevk edilmiş sipariş + POD akışı' },
];

const INVENTORY = [
  { sku: 'WAS-09-INOX', name: 'Çamaşır Makinesi 9 kg', category: 'Çamaşır', slot: 'D-04-02-A', qty: 48, min: 18, status: 'GÜVENLİ', serial: 'W9X-2408-1182' },
  { sku: 'FRG-480-NF', name: 'No-Frost Buzdolabı', category: 'Soğutma', slot: 'D-02-01-C', qty: 26, min: 14, status: 'GÜVENLİ', serial: 'F48-2410-0291' },
  { sku: 'DW-14-STEEL', name: 'Bulaşık Makinesi 14 Kişilik', category: 'Bulaşık', slot: 'C-01-03-B', qty: 12, min: 16, status: 'İKMALE İHTİYAÇ', serial: 'DW14-2407-2240' },
  { sku: 'OVN-72-BLK', name: 'Ankastre Fırın 72 L', category: 'Pişirme', slot: 'B-03-01-A', qty: 31, min: 10, status: 'GÜVENLİ', serial: 'OV72-2411-0074' },
  { sku: 'DRY-8-HP', name: 'Isı Pompalı Kurutma', category: 'Kurutma', slot: 'D-04-01-B', qty: 8, min: 12, status: 'KRİTİK', serial: 'DR8-2409-1008' },
  { sku: 'HOB-IND-4', name: '4 Gözlü İndüksiyon Ocak', category: 'Pişirme', slot: 'A-02-02-D', qty: 19, min: 8, status: 'GÜVENLİ', serial: 'IH4-2410-3312' },
];

const MODULES = [
  { id: 'control', label: 'Kontrol Odası', icon: LayoutDashboard },
  { id: 'inventory', label: 'Envanter', icon: Boxes },
  { id: 'academy', label: 'Ders Materyali', icon: BookOpen },
  { id: 'report', label: 'Ödev Raporu', icon: FileBarChart },
];

function cx(...items) { return items.filter(Boolean).join(' '); }
function safeText(value, fallback = '') { return String(value ?? fallback).trim().slice(0, 180); }
function formatTime(date = new Date()) { return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function stepFromMessage(value) {
  const raw = String(value ?? 'auto').trim().toLocaleLowerCase('tr-TR');
  if (!raw || raw === 'auto' || raw === 'next' || raw === 'sonraki') return -1;
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 6) return numeric - 1;
  const id = OPERATIONS.findIndex((item) => item.id === raw || item.name.toLocaleLowerCase('tr-TR') === raw || item.short.toLocaleLowerCase('tr-TR') === raw);
  return id >= 0 ? id : -1;
}

function playConfirmationTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    [740, 1040].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.105);
      gain.gain.setValueAtTime(0.0001, now + index * 0.105);
      gain.gain.exponentialRampToValueAtTime(0.09, now + index * 0.105 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.105 + 0.12);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + index * 0.105);
      oscillator.stop(now + index * 0.105 + 0.14);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch { /* Ses izni yoksa operasyon akışı yine çalışır. */ }
}

function useNtfyBridge(topic, onExternalEvent) {
  const [status, setStatus] = useState('connecting');
  const [lastSeen, setLastSeen] = useState(null);
  const [lastError, setLastError] = useState('');
  const callbackRef = useRef(onExternalEvent);
  useEffect(() => { callbackRef.current = onExternalEvent; }, [onExternalEvent]);

  useEffect(() => {
    if (!topic) return undefined;
    let stream;
    let disposed = false;
    try {
      const url = `https://ntfy.sh/${encodeURIComponent(topic)}/sse`;
      stream = new EventSource(url);
      stream.onopen = () => { if (!disposed) { setStatus('connected'); setLastError(''); } };
      stream.onerror = () => { if (!disposed) setStatus('reconnecting'); };
      stream.addEventListener('message', (event) => {
        if (disposed) return;
        try {
          const envelope = JSON.parse(event.data);
          const raw = envelope.message ?? envelope.data ?? '';
          const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setLastSeen(new Date());
          if (payload?.event === 'NFC_SCAN' && payload?.source !== 'wms-dashboard') callbackRef.current?.(payload);
        } catch {
          setLastError('ntfy kanalında okunamayan bir mesaj alındı.');
        }
      });
    } catch (error) {
      setStatus('offline');
      setLastError(error.message);
    }
    return () => { disposed = true; stream?.close(); };
  }, [topic]);

  return { status, lastSeen, lastError };
}

function WarehouseScene({ activeStep, runToken, darkMode, barcodeMode }) {
  return (
    <Canvas shadows dpr={[1, 1.7]} camera={{ position: [16, 13, 19], fov: 39 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={[darkMode ? '#08111b' : '#111b26']} />
      <fog attach="fog" args={[darkMode ? '#08111b' : '#111b26', 26, 58]} />
      <ambientLight intensity={darkMode ? 0.25 : 0.58} />
      <directionalLight position={[-8, 17, 9]} intensity={darkMode ? 1.2 : 2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <pointLight position={[0, 7, -1]} intensity={darkMode ? 1.0 : 0.35} color="#61b7ff" distance={25} />
      <WarehouseFloor darkMode={darkMode} />
      <WarehouseBackWall darkMode={darkMode} />
      <RackBank x={-6.1} mirrored={false} darkMode={darkMode} />
      <RackBank x={6.1} mirrored darkMode={darkMode} />
      <DockTruck activeStep={activeStep} runToken={runToken} />
      <TurretTruck activeStep={activeStep} runToken={runToken} darkMode={darkMode} />
      <ReplenishmentLift activeStep={activeStep} runToken={runToken} darkMode={darkMode} />
      <StretchStation activeStep={activeStep} runToken={runToken} />
      <BarcodeLaser activeStep={activeStep} barcodeMode={barcodeMode} darkMode={darkMode} />
      <SafetyLights darkMode={darkMode} />
      <ContactShadows position={[0, 0.012, 0]} opacity={darkMode ? 0.23 : 0.34} scale={28} blur={2.2} far={8} />
      <OrbitControls makeDefault target={[0, 1.25, 0]} minDistance={10} maxDistance={32} maxPolarAngle={Math.PI / 2.02} minPolarAngle={0.36} enableDamping dampingFactor={0.06} />
    </Canvas>
  );
}

function WarehouseFloor({ darkMode }) {
  const lineMat = darkMode ? '#17354a' : '#263c4d';
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color={darkMode ? '#101b24' : '#26323d'} roughness={0.93} metalness={0.12} />
      </mesh>
      <gridHelper args={[25, 38, lineMat, darkMode ? '#122837' : '#354756']} position={[0, 0.004, 0]} />
      {[-8.5, -4.8, 0, 4.8, 8.5].map((z) => <mesh key={`lane-${z}`} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.05, 0.055]} /><meshBasicMaterial color={z === 0 ? '#e3a64a' : '#71818c'} transparent opacity={0.55} /></mesh>)}
      {[-2.0, 2.0].map((x) => <mesh key={`aisle-${x}`} position={[x, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.045, 18]} /><meshBasicMaterial color="#e0aa51" transparent opacity={0.65} /></mesh>)}
    </group>
  );
}

function WarehouseBackWall({ darkMode }) {
  return (
    <group>
      <mesh position={[0, 5.2, -9.8]} receiveShadow><boxGeometry args={[24, 10.4, 0.25]} /><meshStandardMaterial color={darkMode ? '#111d29' : '#34414b'} metalness={0.28} roughness={0.8} /></mesh>
      {[-8, -4, 0, 4, 8].map((x) => <mesh key={x} position={[x, 5.2, -9.62]}><boxGeometry args={[0.1, 10, 0.11]} /><meshStandardMaterial color="#5a6b77" metalness={0.5} /></mesh>)}
      {[2.8, 5.7, 8.5].map((y) => <mesh key={y} position={[0, y, -9.61]}><boxGeometry args={[23.7, 0.08, 0.1]} /><meshStandardMaterial color="#71818c" metalness={0.45} /></mesh>)}
      <mesh position={[0, 9.2, -9.4]}><boxGeometry args={[7.5, 0.66, 0.16]} /><meshStandardMaterial color="#1d2e3e" /></mesh>
      <Html position={[0, 9.2, -9.25]} center distanceFactor={14} style={{ pointerEvents: 'none' }}><div className="scene-sign">GROUP 03 <span>·</span> CENTRAL DISTRIBUTION HUB</div></Html>
    </group>
  );
}

function RackBank({ x, mirrored, darkMode }) {
  const positions = [-7.4, -4.5, -1.6, 1.3, 4.2, 7.1];
  const rows = [0.8, 2.55, 4.3];
  const frameMat = <meshStandardMaterial color="#748592" metalness={0.72} roughness={0.34} />;
  const beamMat = <meshStandardMaterial color="#bf5941" metalness={0.35} roughness={0.5} />;
  const products = [];
  positions.forEach((z, index) => {
    rows.slice(0, 2).forEach((y, shelfIndex) => {
      products.push({ z: z + 0.46, y: y + 0.36, key: `${index}-${shelfIndex}`, color: (index + shelfIndex) % 3 === 0 ? '#d8e0e4' : '#bfcbd2' });
    });
  });
  return (
    <group position={[x, 0, 0]}>
      {positions.map((z) => <group key={`upright-${z}`} position={[0, 0, z]}>
        <mesh castShadow position={[0, 2.58, 0]}><boxGeometry args={[0.16, 5.25, 0.16]} />{frameMat}</mesh>
        <mesh position={[0.42 * (mirrored ? -1 : 1), 0.15, 0]}><boxGeometry args={[1.15, 0.14, 0.14]} />{frameMat}</mesh>
        <mesh position={[0.42 * (mirrored ? -1 : 1), 0.52, 0]}><boxGeometry args={[1.15, 0.08, 0.12]} />{frameMat}</mesh>
      </group>)}
      {rows.map((y) => <group key={`beam-${y}`}>
        <mesh castShadow position={[0, y, 0]}><boxGeometry args={[0.2, 0.16, 15.1]} />{beamMat}</mesh>
        <mesh position={[mirrored ? -0.76 : 0.76, y - 0.06, 0]}><boxGeometry args={[1.35, 0.11, 15.1]} /><meshStandardMaterial color="#8f9da7" metalness={0.7} roughness={0.38} /></mesh>
      </group>)}
      {products.map((p) => (
        <group key={p.key} position={[mirrored ? -0.72 : 0.72, p.y, p.z]}>
          <mesh castShadow position={[0, -0.28, 0]}><boxGeometry args={[1.12, 0.18, 1.22]} /><meshStandardMaterial color="#7e6043" roughness={0.85} /></mesh>
          <mesh castShadow><boxGeometry args={[0.86, 0.58, 0.92]} /><meshStandardMaterial color={darkMode ? '#c3d2dc' : p.color} roughness={0.62} metalness={0.08} /></mesh>
          <mesh position={[0, 0, 0.47]}><boxGeometry args={[0.24, 0.16, 0.016]} /><meshBasicMaterial color="#263d4d" /></mesh>
          <mesh position={[0, -0.02, 0.483]}><planeGeometry args={[0.15, 0.08]} /><meshBasicMaterial color="#eef4f6" /></mesh>
        </group>
      ))}
      {[-6, -3, 0, 3, 6].map((z) => <mesh key={`support-${z}`} position={[mirrored ? -0.3 : 0.3, 2.4, z]}><boxGeometry args={[0.08, 4.8, 0.08]} />{frameMat}</mesh>)}
      <Html position={[mirrored ? -1.1 : 1.1, 5.7, -7.55]} transform distanceFactor={13} style={{ pointerEvents: 'none' }}><div className="rack-tag">DRIVE-IN / {mirrored ? 'D' : 'C'}-04</div></Html>
    </group>
  );
}

function DockTruck({ activeStep, runToken }) {
  const leftDoor = useRef();
  const rightDoor = useRef();
  const lastToken = useRef(-1);
  const start = useRef(0);
  useFrame((state) => {
    if (lastToken.current !== runToken) { lastToken.current = runToken; start.current = state.clock.elapsedTime; }
    const t = THREE.MathUtils.clamp((state.clock.elapsedTime - start.current) / 2.2, 0, 1);
    const open = activeStep === 0 || activeStep === 5 ? Math.sin(t * Math.PI * 0.5) : 0;
    const angle = open * 1.38;
    if (leftDoor.current) leftDoor.current.rotation.y = angle;
    if (rightDoor.current) rightDoor.current.rotation.y = -angle;
  });
  return (
    <group position={[-8.25, 0, 5.8]}>
      <mesh castShadow position={[0, 1.92, 0]}><boxGeometry args={[3.25, 3.65, 6.0]} /><meshStandardMaterial color="#dce2e5" roughness={0.7} metalness={0.13} /></mesh>
      <mesh position={[0, 1.92, 3.04]}><boxGeometry args={[3.0, 3.4, 0.08]} /><meshStandardMaterial color="#9baab4" /></mesh>
      <mesh castShadow position={[0, 0.52, 4.15]}><boxGeometry args={[1.75, 0.96, 2.0]} /><meshStandardMaterial color="#bf3e35" metalness={0.2} roughness={0.62} /></mesh>
      <mesh position={[0, 1.1, 4.93]}><boxGeometry args={[1.48, 0.68, 0.04]} /><meshStandardMaterial color="#1b2d3b" /></mesh>
      <mesh position={[0, 1.02, 4.96]}><boxGeometry args={[1.16, 0.07, 0.03]} /><meshBasicMaterial color="#d6e1e7" /></mesh>
      {[-1.1, 1.1].map((x) => <mesh key={x} castShadow position={[x, 0.42, 4.0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.48, 0.48, 0.26, 24]} /><meshStandardMaterial color="#171c22" roughness={0.95} /></mesh>)}
      <group ref={leftDoor} position={[-1.51, 1.92, 3.03]}>
        <mesh position={[-0.73, 0, 0]} castShadow><boxGeometry args={[1.46, 3.4, 0.1]} /><meshStandardMaterial color="#edf1f2" roughness={0.62} /></mesh>
        {[-1.15, -0.55].map((x) => <mesh key={x} position={[x, 0, 0.06]}><boxGeometry args={[0.045, 3.0, 0.04]} /><meshStandardMaterial color="#9daab1" /></mesh>)}
      </group>
      <group ref={rightDoor} position={[1.51, 1.92, 3.03]}>
        <mesh position={[0.73, 0, 0]} castShadow><boxGeometry args={[1.46, 3.4, 0.1]} /><meshStandardMaterial color="#edf1f2" roughness={0.62} /></mesh>
        {[-0.05, 0.55].map((x) => <mesh key={x} position={[x, 0, 0.06]}><boxGeometry args={[0.045, 3.0, 0.04]} /><meshStandardMaterial color="#9daab1" /></mesh>)}
      </group>
      <mesh position={[0, 3.84, 0]}><boxGeometry args={[3.34, 0.12, 6.1]} /><meshStandardMaterial color="#7b8992" /></mesh>
      <Html position={[0, 4.05, 0.2]} center distanceFactor={10} style={{ pointerEvents: 'none' }}><div className="truck-tag">INBOUND · TR-048</div></Html>
    </group>
  );
}

function TurretTruck({ activeStep, runToken, darkMode }) {
  const group = useRef();
  const mast = useRef();
  const lastToken = useRef(-1);
  const start = useRef(0);
  useFrame((state) => {
    if (lastToken.current !== runToken) { lastToken.current = runToken; start.current = state.clock.elapsedTime; }
    const elapsed = state.clock.elapsedTime - start.current;
    let x = 0.1; let z = 1.6; let rotation = 0; let lift = 1.7;
    const ease = (value) => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
    if (activeStep === 1) {
      const t = ease(elapsed / 3.4);
      x = THREE.MathUtils.lerp(0.1, 5.0, ease(t / 0.58));
      z = THREE.MathUtils.lerp(1.6, -2.2, Math.max(0, (t - 0.58) / 0.42));
      rotation = THREE.MathUtils.lerp(0, -Math.PI / 2, ease((t - 0.48) / 0.3));
      lift = 1.7 + Math.sin(elapsed * 2.2) * 0.03;
    } else if (activeStep === 4) {
      const t = ease(elapsed / 3.2);
      x = THREE.MathUtils.lerp(5.0, 0.2, t);
      z = THREE.MathUtils.lerp(-2.2, -0.1, t);
      rotation = THREE.MathUtils.lerp(-Math.PI / 2, 0, t);
      lift = 1.3;
    } else {
      x = 0.2 + Math.sin(state.clock.elapsedTime * 0.42) * 0.06;
      z = 1.7 + Math.sin(state.clock.elapsedTime * 0.25) * 0.08;
    }
    if (group.current) { group.current.position.set(x, 0, z); group.current.rotation.y = rotation; }
    if (mast.current) mast.current.position.y = lift;
  });
  return (
    <group ref={group}>
      <mesh castShadow position={[0, 0.42, 0]}><boxGeometry args={[1.18, 0.62, 1.78]} /><meshStandardMaterial color="#e3a447" metalness={0.33} roughness={0.45} /></mesh>
      <mesh castShadow position={[0, 0.85, -0.12]}><boxGeometry args={[0.92, 0.36, 0.75]} /><meshStandardMaterial color="#263746" metalness={0.42} /></mesh>
      <mesh position={[0, 0.97, -0.15]}><boxGeometry args={[0.68, 0.08, 0.55]} /><meshStandardMaterial color="#79bde7" emissive="#1d6c9b" emissiveIntensity={0.35} transparent opacity={0.8} /></mesh>
      {[-0.42, 0.42].map((x) => <mesh key={x} castShadow position={[x, 0.23, 0.62]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.24, 0.24, 0.18, 18]} /><meshStandardMaterial color="#151d24" roughness={0.95} /></mesh>)}
      <group ref={mast} position={[0, 1.7, -0.66]}>
        <mesh position={[0.48, 0.62, 0]}><boxGeometry args={[0.09, 2.9, 0.1]} /><meshStandardMaterial color="#9daab4" metalness={0.7} /></mesh>
        <mesh position={[0.66, 0.62, 0]}><boxGeometry args={[0.09, 2.9, 0.1]} /><meshStandardMaterial color="#9daab4" metalness={0.7} /></mesh>
        <mesh position={[0.56, 0.92, 0.1]}><boxGeometry args={[1.3, 0.08, 0.12]} /><meshStandardMaterial color="#e9b657" metalness={0.4} /></mesh>
        <mesh position={[1.06, 0.92, 0.38]}><boxGeometry args={[1.0, 0.08, 0.12]} /><meshStandardMaterial color="#c7d0d5" /></mesh>
      </group>
      <mesh position={[0, 1.4, 0.05]}><boxGeometry args={[0.42, 0.03, 0.42]} /><meshBasicMaterial color={darkMode ? '#4ad6ff' : '#6db7de'} /></mesh>
      <Html position={[0, 2.0, 0.5]} center distanceFactor={12} style={{ pointerEvents: 'none' }}><div className="vehicle-label">TURRET · TT-03</div></Html>
    </group>
  );
}

function ReplenishmentLift({ activeStep, runToken, darkMode }) {
  const pallet = useRef();
  const beam = useRef();
  const lastToken = useRef(-1);
  const start = useRef(0);
  useFrame((state) => {
    if (lastToken.current !== runToken) { lastToken.current = runToken; start.current = state.clock.elapsedTime; }
    const elapsed = state.clock.elapsedTime - start.current;
    if (pallet.current) {
      if (activeStep === 3) {
        const p = THREE.MathUtils.clamp(elapsed / 2.7, 0, 1);
        const eased = p * p * (3 - 2 * p);
        pallet.current.position.y = THREE.MathUtils.lerp(4.1, 1.35, eased);
        pallet.current.visible = true;
      } else {
        pallet.current.position.y = 4.1;
        pallet.current.visible = true;
      }
    }
    if (beam.current) {
      beam.current.material.opacity = activeStep === 3 ? 0.35 + Math.sin(state.clock.elapsedTime * 9) * 0.16 : 0;
    }
  });
  return (
    <group position={[5.3, 0, -2.2]}>
      <mesh ref={beam} position={[0, 2.65, 0]}><cylinderGeometry args={[0.045, 0.045, 2.9, 12]} /><meshBasicMaterial color="#55d9ff" transparent opacity={0} /></mesh>
      <group ref={pallet} position={[0, 4.1, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}><boxGeometry args={[1.0, 0.18, 1.0]} /><meshStandardMaterial color="#8b6745" /></mesh>
        <mesh castShadow position={[0, 0.13, 0]}><boxGeometry args={[0.82, 0.62, 0.82]} /><meshStandardMaterial color="#e2e8e8" roughness={0.62} /></mesh>
        <mesh position={[0, 0.12, 0.42]}><boxGeometry args={[0.23, 0.13, 0.018]} /><meshBasicMaterial color="#263e4c" /></mesh>
      </group>
      {darkMode && <pointLight position={[0, 2.4, 0]} color="#57d8ff" intensity={activeStep === 3 ? 2.4 : 0.25} distance={4} />}
      <Html position={[0, 5.15, 0]} center distanceFactor={13} style={{ pointerEvents: 'none' }}><div className={cx('lift-label', activeStep === 3 && 'active')}>REPLENISH / P-02</div></Html>
    </group>
  );
}

function StretchStation({ activeStep, runToken }) {
  const platform = useRef();
  const film = useRef();
  const lastToken = useRef(-1);
  const start = useRef(0);
  useFrame((state) => {
    if (lastToken.current !== runToken) { lastToken.current = runToken; start.current = state.clock.elapsedTime; }
    const wrapping = activeStep === 5;
    if (platform.current) platform.current.rotation.y = wrapping ? (state.clock.elapsedTime - start.current) * 3.0 : 0;
    if (film.current) {
      film.current.rotation.y = state.clock.elapsedTime * (wrapping ? 3.1 : 0.18);
      film.current.position.y = 0.6 + (wrapping ? (0.56 + Math.sin((state.clock.elapsedTime - start.current) * 3.0) * 0.48) : 0.18);
      film.current.visible = wrapping;
    }
  });
  return (
    <group position={[2.85, 0, 4.7]}>
      <mesh castShadow position={[0, 0.18, 0]}><cylinderGeometry args={[1.15, 1.15, 0.3, 40]} /><meshStandardMaterial color="#536471" metalness={0.62} roughness={0.4} /></mesh>
      <group ref={platform}>
        <mesh position={[0, 0.41, 0]} castShadow><boxGeometry args={[0.9, 0.66, 0.9]} /><meshStandardMaterial color="#e2e8e9" roughness={0.52} /></mesh>
        <mesh position={[0, 0.42, 0.46]}><boxGeometry args={[0.24, 0.12, 0.018]} /><meshBasicMaterial color="#263d4a" /></mesh>
      </group>
      <mesh ref={film} position={[0, 0.9, 0]}><torusGeometry args={[0.68, 0.018, 8, 48]} /><meshStandardMaterial color="#b7e6f4" transparent opacity={0.52} metalness={0.25} roughness={0.22} /></mesh>
      <mesh position={[1.5, 0.66, 0]}><boxGeometry args={[0.16, 1.25, 0.16]} /><meshStandardMaterial color="#7f8f99" metalness={0.58} /></mesh>
      <Html position={[0, 1.7, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}><div className="station-label">WRAP STATION · S-01</div></Html>
    </group>
  );
}

function BarcodeLaser({ activeStep, barcodeMode, darkMode }) {
  const line = useRef();
  useFrame((state) => {
    if (line.current) {
      line.current.material.opacity = barcodeMode ? 0.8 : activeStep === 4 ? 0.42 + Math.sin(state.clock.elapsedTime * 7) * 0.24 : 0.04;
      line.current.position.z = -0.25 + Math.sin(state.clock.elapsedTime * 2.1) * 0.4;
    }
  });
  return (
    <group position={[1.9, 1.6, 2.1]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.3, 2.3, 0.3]} /><meshStandardMaterial color="#53636f" metalness={0.65} /></mesh>
      <mesh position={[0, 1.22, 0]}><boxGeometry args={[0.55, 0.32, 0.5]} /><meshStandardMaterial color="#283d4f" /></mesh>
      <mesh ref={line} position={[1.9, -0.38, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.035, 4.0, 0.035]} /><meshBasicMaterial color={darkMode ? '#4df3ff' : '#f05c49'} transparent opacity={0.05} /></mesh>
      {(barcodeMode || activeStep === 4) && <pointLight position={[1.8, -0.35, 0]} color="#ff5447" intensity={1.5} distance={4} />}
    </group>
  );
}

function SafetyLights({ darkMode }) {
  return (
    <group>
      {[[-10, 0.16, -8.5], [10, 0.16, -8.5], [-10, 0.16, 8.5], [10, 0.16, 8.5]].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}><boxGeometry args={[0.12, 0.16, 0.12]} /><meshBasicMaterial color={darkMode ? '#52e4ff' : '#e8b55e'} /></mesh>
      ))}
      {darkMode && <pointLight position={[-5, 1, 1]} color="#e34f3d" intensity={0.9} distance={12} />}
    </group>
  );
}

function PhoneMock({ connected, videoRef, status }) {
  return (
    <div className={cx('phone-frame', connected && 'phone-connected')}>
      <div className="phone-side-button phone-side-button-a" />
      <div className="phone-side-button phone-side-button-b" />
      <div className="phone-screen">
        <div className="phone-island" />
        {connected ? (
          <video ref={videoRef} autoPlay playsInline muted className="phone-video" />
        ) : (
          <div className="phone-preview">
            <div className="phone-statusbar"><span>9:41</span><span><Signal size={10} /><Wifi size={10} /><BatteryCharging size={10} /></span></div>
            <div className="phone-app-head"><span className="phone-app-mark">B</span><div><b>WMS MOBILE</b><small>Grup 03 · Warehouse</small></div><MoreHorizontal size={14} /></div>
            <div className="phone-greeting"><small>MERHABA, OPERATÖR</small><b>Vardiya paneli</b><span>11 Kasım · Gece vardiyası</span></div>
            <div className="phone-mini-kpis"><div><b>98.2%</b><small>Doluluk</small></div><div><b>1,284</b><small>Palet</small></div></div>
            <div className="phone-task-title">GÖREVLERİM <span>03 AÇIK</span></div>
            {['D-04 · Raflama doğrulaması', 'P-02 · İkmal kontrolü', 'B-03 · Sevkiyat onayı'].map((item, index) => <div className="phone-task" key={item}><span className={`phone-task-dot dot-${index}`} /><span>{item}</span><ChevronRight size={11} /></div>)}
            <div className="phone-scan-button"><ScanLine size={12} /> Barkod Tara</div>
            <div className="phone-bottom-nav"><span>⌂</span><span>▦</span><span>◎</span><span>≡</span></div>
            <div className="phone-preview-status">{status === 'pairing' ? 'EŞLEŞME BEKLENİYOR' : 'CANLI ÖNİZLEME'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneSender({ room }) {
  const [status, setStatus] = useState('ready');
  const [message, setMessage] = useState('Masaüstü kontrol odasıyla güvenli eşleşme bekleniyor.');
  const [supported, setSupported] = useState(false);
  const [sharing, setSharing] = useState(false);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const pendingCandidates = useRef([]);

  useEffect(() => {
    setSupported(Boolean(navigator.mediaDevices?.getDisplayMedia));
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      pcRef.current?.close();
      wsRef.current?.close();
    };
  }, []);

  const stopSharing = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    streamRef.current = null;
    pcRef.current = null;
    wsRef.current = null;
    setSharing(false);
    setStatus('ready');
    setMessage('Ekran paylaşımı durduruldu.');
  };

  const startSharing = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setStatus('unsupported');
        setMessage('Bu iPhone tarayıcısında web ekran yakalama API’si kullanılamıyor. AirPlay / kablolu yansıtma kullanın veya destekleyen bir tarayıcı/cihaz deneyin.');
        return;
      }
      if (!window.isSecureContext) {
        setStatus('error');
        setMessage('Ekran paylaşımı için HTTPS bağlantısı gerekiyor.');
        return;
      }
      setStatus('requesting');
      setMessage('iPhone ekran paylaşım izni bekleniyor…');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      streamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'signal', signal: { candidate: event.candidate } }));
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { setStatus('connected'); setMessage('Ekran masaüstü kontrol odasına aktarılıyor.'); }
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) setStatus('disconnected');
      };
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/signal`);
      wsRef.current = socket;
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'join', room, role: 'sender' }));
        setStatus('pairing');
        setMessage('Masaüstü eşleşme sinyali gönderildi.');
      };
      socket.onmessage = async (event) => {
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        if (packet.type === 'signal') {
          try {
            if (packet.signal?.description) {
              await pc.setRemoteDescription(packet.signal.description);
              const candidates = pendingCandidates.current.splice(0);
              for (const candidate of candidates) await pc.addIceCandidate(candidate);
              if (packet.signal.description.type === 'offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.send(JSON.stringify({ type: 'signal', signal: { description: pc.localDescription } }));
              }
            } else if (packet.signal?.candidate) {
              if (pc.remoteDescription) await pc.addIceCandidate(packet.signal.candidate);
              else pendingCandidates.current.push(packet.signal.candidate);
            }
          } catch (error) { setMessage(`Bağlantı sinyali işlenemedi: ${error.message}`); }
        }
      };
      socket.onerror = () => { setStatus('error'); setMessage('Eşleşme sunucusuna bağlanılamadı.'); };
      socket.onclose = () => { if (status !== 'connected') setStatus('disconnected'); };
      stream.getVideoTracks()[0]?.addEventListener('ended', () => stopSharing());
      setSharing(true);
    } catch (error) {
      setStatus('error');
      setMessage(error.name === 'NotAllowedError' ? 'Ekran paylaşımı kullanıcı tarafından iptal edildi.' : error.message);
    }
  };

  return (
    <div className="phone-sender-page">
      <div className="sender-brand"><span className="brand-mark">B</span><div><b>BOSCH</b><small>WMS MOBILE BRIDGE</small></div><span className="sender-secure"><LockKeyhole size={12} /> SECURE SESSION</span></div>
      <div className="sender-content">
        <div className="sender-icon"><Smartphone size={34} /></div>
        <div className="eyebrow">PHYGITAL DEVICE LINK / 01</div>
        <h1>iPhone ekranını<br /><em>kontrol odasına</em> aktar.</h1>
        <p>Bu oturum yalnızca ekran paylaşım iznini verdiğinizde başlar. Görüntü WebRTC üzerinden eşleştirilmiş masaüstü oturumuna aktarılır.</p>
        <div className={cx('sender-status', `status-${status}`)}><span className="status-dot" />{message}</div>
        {!sharing ? <button className="primary-action sender-start" onClick={startSharing} disabled={!supported}><Smartphone size={16} /> Ekranımı Paylaş <ArrowRight size={16} /></button> : <button className="secondary-action sender-start" onClick={stopSharing}><X size={16} /> Paylaşımı Durdur</button>}
        {!supported && <div className="sender-warning"><Info size={15} /> Bu tarayıcıda getDisplayMedia desteklenmiyor. Destekleyen bir tarayıcı/cihazda tekrar deneyin veya iPhone'un yerleşik ekran yansıtma özelliğini kullanın.</div>}
        <div className="sender-footer"><span>PAIRING ROOM</span><code>{room}</code><span>·</span><span>Uçtan uca WebRTC medya akışı</span></div>
      </div>
    </div>
  );
}

function TopBar({ darkMode, setDarkMode, ntfyStatus, onFullscreen, onOpenHelp }) {
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return (
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark">B</div><div className="brand-type"><b>BOSCH</b><span>WMS COMMAND CENTER</span></div><div className="brand-divider" /><div className="product-label">DIGITAL TWIN <span>·</span> GRUP 03</div></div>
      <div className="topbar-center"><span className="live-led" /> LIVE OPERATIONS <span className="center-divider" /> <span className="mono">IST / {formatTime(clock)}</span></div>
      <div className="topbar-actions">
        <div className={cx('connection-pill', ntfyStatus === 'connected' ? 'online' : 'warning')}><span className="status-dot" />{ntfyStatus === 'connected' ? 'NTFY ONLINE' : ntfyStatus === 'reconnecting' ? 'RECONNECTING' : 'SIMULATION'}</div>
        <button className="icon-button" title="Yardım" onClick={onOpenHelp}><CircleHelp size={17} /></button>
        <button className="icon-button" title={darkMode ? 'Aydınlık görünüm' : 'Karanlık depo'} onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button className="icon-button" title="Tam ekran" onClick={onFullscreen}><Maximize2 size={17} /></button>
      </div>
    </header>
  );
}

function Sidebar({ activeModule, setActiveModule, onReport }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top"><span className="sidebar-kicker">NAVIGATION</span>
        {MODULES.map((module) => {
          const Icon = module.icon;
          return <button key={module.id} className={cx('nav-item', activeModule === module.id && 'active')} onClick={() => setActiveModule(module.id)} title={module.label}><Icon size={19} /><span>{module.label}</span><i /></button>;
        })}
      </div>
      <div className="sidebar-bottom"><div className="sidebar-module"><div className="module-orb"><Cpu size={17} /></div><div><b>DIGITAL TWIN</b><small>CORE v1.0.4</small></div></div><button className="nav-item compact" onClick={onReport}><FileText size={18} /><span>Raporu Aç</span></button><div className="sidebar-foot">BOSCH<br />GROUP 03 <span>© 2026</span></div></div>
    </aside>
  );
}

function MetricCard({ label, value, sub, icon: Icon, trend, accent }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={cx('metric-icon', accent)}><Icon size={14} /></span></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{sub}</span><span className="metric-trend">{trend}</span></div></div>;
}

function SceneHud({ activeStep, onSelectStep, onNext, onAutoRun, autoRunning, darkMode, setDarkMode, barcodeMode, setBarcodeMode }) {
  const active = OPERATIONS[Math.max(activeStep, 0)];
  const progress = activeStep < 0 ? 0 : ((activeStep + 1) / 6) * 100;
  return (
    <>
      <div className="scene-topline">
        <div><div className="eyebrow">LIVE FACILITY OVERVIEW <span>·</span> ISTANBUL / TR-34</div><h1>Merkezi Dağıtım <em>Deposu</em></h1><p>Endüstriyel beyaz eşya lojistiği / 3B operasyon simülasyonu</p></div>
        <div className="scene-top-actions"><span className="scene-state"><span className="status-dot" />{darkMode ? 'DARK WAREHOUSE' : 'FACILITY ONLINE'}</span><button className={cx('scene-tool', barcodeMode && 'selected')} onClick={() => setBarcodeMode(!barcodeMode)}><ScanLine size={15} /> LAZER TARAMA</button><button className={cx('scene-tool', darkMode && 'selected')} onClick={() => setDarkMode(!darkMode)}><Moon size={15} /> 7/24 MODE</button></div>
      </div>
      <div className="scene-kpis">
        <MetricCard label="AKTİF SKU" value="3,248" sub="12 ürün ailesi" icon={Boxes} trend="+4.8%" accent="blue" />
        <MetricCard label="DEPO DOLULUĞU" value="98.2%" sub="Drive-In blokları" icon={Gauge} trend="OPTIMAL" accent="red" />
        <MetricCard label="SİPARİŞ / GÜN" value="1,426" sub="Türkiye geneli" icon={Truck} trend="+12.3%" accent="blue" />
        <MetricCard label="ENVANTER DOĞRULUĞU" value="99.7%" sub="Barkod doğrulama" icon={ShieldCheck} trend="+0.4%" accent="green" />
      </div>
      <div className="scene-bottom-hud">
        <div className="timeline-heading"><div><span className="eyebrow">OPERATION TIMELINE</span><b>6 aşamalı depo akışı</b></div><div className="timeline-progress"><span>{activeStep < 0 ? '0' : String(activeStep + 1).padStart(2, '0')}<i>/06</i></span><div><span style={{ width: `${progress}%` }} /></div></div></div>
        <div className="timeline-steps">
          {OPERATIONS.map((operation, index) => {
            const Icon = operation.icon;
            const isActive = activeStep === index;
            const isDone = activeStep > index;
            return <button key={operation.id} className={cx('timeline-step', isActive && 'active', isDone && 'done')} onClick={() => onSelectStep(index)}><span className="timeline-number">{isDone ? <Check size={12} /> : operation.number}</span><span className="timeline-icon"><Icon size={15} /></span><span className="timeline-copy"><b>{operation.short}</b><small>{operation.area}</small></span>{index < 5 && <span className="timeline-connector" />}</button>;
          })}
        </div>
        <div className="timeline-footer"><div className="active-stage"><span className="active-stage-led" /><div><small>AKTİF OPERASYON</small><b>{activeStep < 0 ? 'Başlatılmayı bekliyor' : active.name}</b></div></div><div className="timeline-controls"><button className="secondary-action" onClick={onAutoRun}>{autoRunning ? <Pause size={14} /> : <Play size={14} />}{autoRunning ? 'DURDUR' : 'OTOMATİK AKIŞ'}</button><button className="primary-action" onClick={onNext}><Radio size={15} /> NFC KART OKUT <ChevronRight size={15} /></button></div></div>
      </div>
    </>
  );
}

function ControlRoom({ activeStep, runToken, darkMode, setDarkMode, barcodeMode, setBarcodeMode, onSelectStep, onNext, onAutoRun, autoRunning }) {
  return (
    <div className="control-room">
      <div className="scene-canvas"><WarehouseScene activeStep={activeStep} runToken={runToken} darkMode={darkMode} barcodeMode={barcodeMode} /></div>
      <div className="scene-vignette" />
      <SceneHud activeStep={activeStep} onSelectStep={onSelectStep} onNext={onNext} onAutoRun={onAutoRun} autoRunning={autoRunning} darkMode={darkMode} setDarkMode={setDarkMode} barcodeMode={barcodeMode} setBarcodeMode={setBarcodeMode} />
      <div className="scene-controls-hint"><span><RotateCcw size={12} /> Sürükle: döndür</span><span>Scroll: yakınlaştır</span><span>3B SAHNE / INTERACTIVE</span></div>
    </div>
  );
}

function OperationPanel({ activeStep, onNext, onSelectStep, ntfyStatus }) {
  const operation = OPERATIONS[Math.max(activeStep, 0)];
  const Icon = operation.icon;
  return (
    <section className="side-card operation-card">
      <div className="card-heading"><div><span className="eyebrow">CURRENT WORKFLOW</span><h3>Operasyon Kontrolü</h3></div><span className="small-live"><span className="status-dot" /> LIVE</span></div>
      <div className="operation-current"><div className="operation-icon"><Icon size={21} /></div><div className="operation-copy"><small>{activeStep < 0 ? 'HAZIR' : `AŞAMA ${operation.number} / 06`}</small><b>{activeStep < 0 ? 'Mal Kabul' : operation.name}</b><span>{operation.area}</span></div><span className="operation-code">{operation.number}</span></div>
      <p className="operation-detail">{operation.detail}</p>
      <div className="operation-check"><CheckCircle2 size={14} /><span>{operation.checkpoint}</span></div>
      <div className="operation-meta"><div><small>ÇIKTI</small><b>{operation.output}</b></div><div><small>STANDART SÜRE</small><b>{operation.duration}</b></div></div>
      <div className="operation-progress-row"><div>{OPERATIONS.map((step, index) => <button key={step.id} className={cx('progress-node', activeStep === index && 'current', activeStep > index && 'complete')} onClick={() => onSelectStep(index)} aria-label={step.name} />)}</div><span>{activeStep < 0 ? '0 / 6' : `${activeStep + 1} / 6`}</span></div>
      <button className="primary-action full-width" onClick={onNext}><Radio size={14} /> NFC KART OKUT / SONRAKİ ADIM <ArrowRight size={15} /></button>
      <div className="operation-bridge-note"><span className={cx('status-dot', ntfyStatus === 'connected' ? 'green' : 'amber')} />{ntfyStatus === 'connected' ? 'iPhone NFC olayları dinleniyor' : 'Yerel simülasyon aktif'}</div>
    </section>
  );
}

function NfcPanel({ topic, setTopic, ntfyStatus, lastSeen, tagKey, setTagKey, onCopy, secretConfigured }) {
  const tagUrl = `${window.location.origin}/nfc?step=auto&topic=${encodeURIComponent(topic)}${tagKey ? `&key=${encodeURIComponent(tagKey)}` : ''}`;
  return (
    <section className="side-card nfc-card">
      <div className="card-heading"><div><span className="eyebrow">PHYGITAL CONNECTIVITY</span><h3>iPhone NFC Webhook</h3></div><div className={cx('connection-indicator', ntfyStatus === 'connected' ? 'connected' : 'disconnected')}><span className="status-dot" />{ntfyStatus === 'connected' ? 'LIVE' : 'WAITING'}</div></div>
      <div className="ntfy-endpoint"><div className="ntfy-symbol"><Radio size={17} /></div><div className="ntfy-address"><small>NTFY SUBSCRIBE / PUBLISH</small><b>ntfy.sh/{topic}</b></div><button className="copy-mini" onClick={() => onCopy(`https://ntfy.sh/${topic}`)} title="Webhook adresini kopyala"><Copy size={14} /></button></div>
      <label className="field-label">NTFY TOPIC</label><input className="dark-input" value={topic} onChange={(event) => setTopic(event.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100))} placeholder="bosch_grup3_nfc_depo" />
      <label className="field-label">NFC ETİKET ANAHTARI <span>(.env içindeki NFC_SHARED_SECRET)</span></label><input className="dark-input" value={tagKey} onChange={(event) => setTagKey(event.target.value)} placeholder="Etiket güvenlik anahtarı" type="password" />
      <div className="nfc-tag-layout"><div className="qr-shell"><QRCodeCanvas value={tagUrl} size={100} bgColor="#f3f6f6" fgColor="#111b25" level="M" includeMargin /></div><div className="nfc-tag-copy"><b>Etikete yazılacak URL</b><span>iPhone etiketi algıladığında HTTPS bağlantısını açar; sunucu NFC_SCAN olayını ntfy kanalına gönderir.</span><button className="text-action" onClick={() => onCopy(tagUrl)}><Copy size={12} /> URL'Yİ KOPYALA</button></div></div>
      <div className="nfc-status-row"><span><span className={cx('status-dot', ntfyStatus === 'connected' ? 'green' : 'amber')} />{ntfyStatus === 'connected' ? 'Olay akışı açık' : 'Bağlantı yeniden deneniyor'}</span><span>{lastSeen ? `Son mesaj ${formatTime(lastSeen)}` : 'Henüz mesaj yok'}</span></div>
      <div className={cx('nfc-footnote', !secretConfigured && 'warning')}><Info size={12} />{!secretConfigured ? 'Sunucuda NFC_SHARED_SECRET tanımlı değil. .env dosyasına güvenli bir anahtar ekleyip sunucuyu yeniden başlatın.' : !tagKey ? 'Sunucu anahtarı hazır. NFC etiketi QR’si için yukarıya .env içindeki NFC_SHARED_SECRET değerini girin.' : 'URL etiketi → /nfc sunucu köprüsü → ntfy SSE → WMS. Anahtar sunucuda doğrulanır.'}</div>
    </section>
  );
}

function MirrorPanel({ mirrorStatus, mirrorRoom, videoRef, onStart, onStop, pairingUrl, onCopy }) {
  const connected = mirrorStatus === 'connected';
  const pairing = mirrorStatus === 'pairing';
  return (
    <section className="side-card mirror-card">
      <div className="card-heading"><div><span className="eyebrow">DEVICE MIRROR / WEBRTC</span><h3>iPhone Ekran Yansıtma</h3></div><span className={cx('mirror-state', connected && 'active')}>{connected ? 'CONNECTED' : pairing ? 'PAIRING' : 'STANDBY'}</span></div>
      <div className="mirror-layout"><PhoneMock connected={connected} videoRef={videoRef} status={pairing ? 'pairing' : mirrorStatus} /><div className="mirror-info"><div className="mirror-device-title"><Smartphone size={14} /><b>iPhone · Grup 03</b></div><span className="mirror-description">Telefon ekranını bu panele gerçek zamanlı aktarın. QR kodu iPhone ile tarayın.</span><div className="mirror-qr"><QRCodeCanvas value={pairingUrl} size={76} bgColor="#f2f5f6" fgColor="#14212b" level="M" includeMargin /></div><small className="room-code">ROOM / {mirrorRoom}</small><button className={cx('mirror-button', connected && 'stop')} onClick={connected || pairing ? onStop : onStart}>{connected || pairing ? <><X size={12} /> BAĞLANTIYI KES</> : <><Link2 size={12} /> EŞLEŞTİR</>}</button></div></div>
      <div className="mirror-note"><span className={cx('status-dot', connected ? 'green' : 'amber')} />{connected ? 'Canlı ekran akışı alınıyor' : pairing ? 'iPhone paylaşım izni bekleniyor' : 'Bağlantı için QR kodu tarayın'}</div>
    </section>
  );
}

function EventFeed({ events, onClear }) {
  return (
    <section className="side-card feed-card">
      <div className="card-heading"><div><span className="eyebrow">EVENT STREAM</span><h3>Canlı Olay Akışı</h3></div><button className="icon-button tiny" onClick={onClear} title="Olayları temizle"><RefreshCw size={13} /></button></div>
      <div className="event-list">{events.length === 0 ? <div className="empty-feed"><Activity size={17} /><span>Henüz operasyon olayı yok.</span></div> : events.slice(0, 6).map((event) => <div className="event-row" key={event.id}><div className={cx('event-marker', event.kind)}>{event.kind === 'nfc' ? <Radio size={12} /> : event.kind === 'scan' ? <ScanLine size={12} /> : <Zap size={12} />}</div><div className="event-copy"><b>{event.title}</b><span>{event.detail}</span></div><time>{event.time}</time></div>)}</div>
    </section>
  );
}

function RightRail({ activeStep, onNext, onSelectStep, ntfy, topic, setTopic, lastSeen, tagKey, setTagKey, secretConfigured, mirrorStatus, mirrorRoom, videoRef, onStartMirror, onStopMirror, pairingUrl, onCopy, events, onClearEvents }) {
  return (
    <aside className="right-rail">
      <OperationPanel activeStep={activeStep} onNext={onNext} onSelectStep={onSelectStep} ntfyStatus={ntfy.status} />
      <MirrorPanel mirrorStatus={mirrorStatus} mirrorRoom={mirrorRoom} videoRef={videoRef} onStart={onStartMirror} onStop={onStopMirror} pairingUrl={pairingUrl} onCopy={onCopy} />
      <NfcPanel topic={topic} setTopic={setTopic} ntfyStatus={ntfy.status} lastSeen={lastSeen} tagKey={tagKey} setTagKey={setTagKey} onCopy={onCopy} secretConfigured={secretConfigured} />
      <EventFeed events={events} onClear={onClearEvents} />
    </aside>
  );
}

function InventoryModule() {
  const [filter, setFilter] = useState('TÜMÜ');
  const [search, setSearch] = useState('');
  const rows = INVENTORY.filter((item) => (filter === 'TÜMÜ' || item.status === filter) && `${item.name} ${item.sku} ${item.slot}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
  return (
    <div className="module-page inventory-module">
      <div className="module-header"><div><span className="eyebrow">WAREHOUSE MANAGEMENT / STOCK INTELLIGENCE</span><h1>Envanter <em>Merkezi</em></h1><p>SKU, raf adresi, seri numarası ve kritik stok seviyelerinin tek ekrandan takibi.</p></div><div className="module-header-mark"><Boxes size={28} /><span>WMS / INV-01</span></div></div>
      <div className="inventory-summary"><div><small>TOPLAM PALET</small><b>1,284</b><span>+42 bugün</span></div><div><small>AKTİF SKU</small><b>3,248</b><span>12 ürün ailesi</span></div><div><small>KRİTİK STOK</small><b className="red-text">07</b><span>İkmal emri gerekli</span></div><div><small>ENVANTER DOĞRULUĞU</small><b>99.7%</b><span>Son çevrim sayımı 21:00</span></div></div>
      <div className="table-toolbar"><div className="filter-tabs">{['TÜMÜ', 'GÜVENLİ', 'İKMALE İHTİYAÇ', 'KRİTİK'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU / ürün / raf ara…" /></div>
      <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>ÜRÜN / SKU</th><th>KATEGORİ</th><th>RAF ADRESİ</th><th>MEVCUT</th><th>MİN. STOK</th><th>SERİ NUMARASI</th><th>DURUM</th></tr></thead><tbody>{rows.map((item) => <tr key={item.sku}><td><b>{item.name}</b><small>{item.sku}</small></td><td>{item.category}</td><td><span className="slot-code">{item.slot}</span></td><td className="qty-cell">{item.qty}<small> adet</small></td><td>{item.min}</td><td className="mono">{item.serial}</td><td><span className={cx('stock-status', item.status === 'GÜVENLİ' ? 'safe' : item.status === 'KRİTİK' ? 'critical' : 'replenish')}>{item.status}</span></td></tr>)}</tbody></table>{rows.length === 0 && <div className="no-results">Aramanızla eşleşen stok bulunamadı.</div>}</div>
      <div className="inventory-foot"><span><Info size={13} /> Demo stok verileri — WMS API bağlantısı için server adapter hazır.</span><span>SON SENKRONİZASYON / 21:12:08</span></div>
    </div>
  );
}

function AcademyModule() {
  const [selected, setSelected] = useState(0);
  const topics = [
    { title: 'Depo stratejisi', icon: Factory, intro: 'Talep sürekliliği, dağıtım coğrafyası ve gümrüklü stok yönetimi', body: 'Grup 3, 12 ay boyunca talep alan beyaz eşya üreticisi olarak özel depo yaklaşımını benimser. Türkiye geneline erişim için merkezi depo konumlandırması kullanılır. Yurt dışı girişlerinde gümrüklü stok ve işlem ayrıştırması için C Tipi Özel Antrepo kurgusu değerlendirilir.', bullets: ['Özel depo: yılın 12 ayında devam eden talebe göre kapasite ve süreç kontrolü.', 'Merkezi depo: Türkiye genelindeki bayi ağına tek merkezden sevkiyat ve konsolidasyon.', 'C Tipi Özel Antrepo: gümrük gözetimindeki eşyanın mevzuata uygun muhafazası ve işlem takibi.'] },
    { title: 'Drive-In raf sistemi', icon: Layers3, intro: 'Büyük hacimli ürünlerde yüksek hacimsel verim', body: 'Beyaz eşya ürünlerinin ebatları ve paletli depolama karakteristiği nedeniyle Drive-In raf sistemi uygundur. Forklift raf kanalına girerek paletleri derinlik boyunca yerleştirir. Yüksek yoğunluk avantajına karşılık kanal bazlı erişim, parti/SKU ayrımı ve LIFO eğilimi dikkatle yönetilmelidir.', bullets: ['Kanal derinliği ve palet ölçüsü ürün ailesine göre tasarlanır.', 'Kanal girişlerinde çarpma koruyucuları ve raf kapasite levhaları bulunur.', 'SKU/parti ayrımı ve adres doğrulaması barkodla yapılır.'] },
    { title: 'Ekipman filosu', icon: Truck, intro: 'Verimlilik ile iş güvenliğini birlikte tasarlamak', body: 'Forklift, akülü istif makinesi ve turret truck birbirini tamamlayan görevlerde kullanılır. Turret truck dar koridorlarda yükleme yönünü çevirerek alan verimliliğini artırır; akülü istif makinesi kısa mesafeli ikmal ve düşük/orta seviyeli taşımalara destek verir.', bullets: ['Forklift: rampa, blok istif ve paletli ağır yük operasyonları.', 'Akülü istif makinesi: yatay taşıma, alt seviye ikmal ve kısa mesafe transfer.', 'Turret Truck: dar koridor, yüksek raf ve yön değiştirmeli raflama.'] },
    { title: '6 adımlı operasyon', icon: ListChecks, intro: 'Mal kabulden bayi teslimatına uçtan uca izlenebilirlik', body: 'Her fiziksel hareket, WMS üzerinde bir görev ve doğrulama olayı üretir. Böylece ürünün hangi rampadan girdiği, hangi adrese taşındığı, ne zaman ikmal edildiği ve hangi bayi siparişine çıktığı izlenebilir.', bullets: OPERATIONS.map((item) => `${item.number} ${item.name}: ${item.checkpoint}.`) },
    { title: 'Dijitalleşme & tersine lojistik', icon: Barcode, intro: 'Barkod, olay kaydı, otonom karanlık depo ve iade kalite kapısı', body: 'Barkod doğrulama yanlış SKU/raf/seri eşleşmesini azaltır. Karanlık depo modu, düşük insan trafiğiyle 7/24 otomasyon senaryosunu temsil eder; güvenlik için emniyet lazerleri, bölge kilitleme ve acil durdurma senaryoları gerekir. Tersine lojistikte bayi iadeleri ayrı bir kalite kapısına alınır.', bullets: ['İade kabul → barkod/seri doğrulama → hasar fotoğrafı → kalite sınıflandırması.', 'A sınıfı: yeniden satış; B sınıfı: teknik kontrol; C sınıfı: parça/geri dönüşüm.', 'Otonom operasyonlarda emniyet alanları, sensörler ve manuel override zorunludur.'] },
  ];
  const ActiveIcon = topics[selected].icon;
  return (
    <div className="module-page academy-module">
      <div className="module-header"><div><span className="eyebrow">ACADEMIC CONTEXT / GROUP 03</span><h1>Ders Materyali <em>& Ödev Notları</em></h1><p>Beyaz eşya üreticisi için depo tasarım kararları, operasyon gerekçeleri ve dijitalleşme yaklaşımı.</p></div><div className="module-header-mark"><BookOpen size={28} /><span>THEORY / 06</span></div></div>
      <div className="academy-layout"><nav className="academy-nav">{topics.map((topic, index) => { const Icon = topic.icon; return <button key={topic.title} onClick={() => setSelected(index)} className={selected === index ? 'active' : ''}><span className="academy-nav-icon"><Icon size={17} /></span><span><b>{topic.title}</b><small>MODÜL {String(index + 1).padStart(2, '0')}</small></span><ChevronRight size={14} /></button>; })}</nav><article className="academy-article"><div className="article-eyebrow"><span>GROUP 03 / STUDY MATERIAL</span><span>0{selected + 1} — 05</span></div><div className="article-hero-icon"><ActiveIcon size={27} /></div><h2>{topics[selected].title}</h2><h4>{topics[selected].intro}</h4><p>{topics[selected].body}</p><div className="article-bullets">{topics[selected].bullets.map((bullet, index) => <div key={bullet}><span>{String(index + 1).padStart(2, '0')}</span><p>{bullet}</p></div>)}</div><div className="article-source"><Info size={13} /><span>İçerik, ödev brief'inde sağlanan [1] ve [2] numaralı ders notlarının uygulama senaryosuna uyarlanmış özetidir.</span></div></article></div>
    </div>
  );
}

function ReportModule({ onPrint }) {
  return (
    <div className="module-page report-module">
      <div className="module-header"><div><span className="eyebrow">PROJECT DOCUMENTATION / FINAL SUBMISSION</span><h1>Ödev <em>Raporu</em></h1><p>Grup 3 — Beyaz Eşya Üreticisi / WMS ve Canlı Depo Dijital İkizi</p></div><button className="primary-action" onClick={onPrint}><Download size={15} /> RAPORU YAZDIR / PDF</button></div>
      <div className="report-cover"><div className="report-cover-grid"><div><span>LOGISTICS SYSTEM DESIGN / 2026</span><h2>Warehouse<br /><em>Command Center.</em></h2><p>Endüstriyel depo yönetimi, fiziksel operasyon ve dijital ikiz modelinin bütünleşik tasarımı.</p><div className="report-cover-meta"><div><small>PROJE EKİBİ</small><b>GRUP 03</b></div><div><small>SEKTÖR</small><b>BEYAZ EŞYA ÜRETİMİ</b></div><div><small>SİSTEM</small><b>WMS / DIGITAL TWIN</b></div></div></div><div className="report-cover-emblem"><div className="emblem-ring"><Factory size={58} /></div><span>INDUSTRY<br />4.0</span></div></div></div>
      <div className="report-body"><section><span className="report-index">01 / AMAÇ</span><h3>Projenin amacı ve kapsamı</h3><p>Bu çalışmanın amacı, yıl boyunca talep gören beyaz eşya ürünlerinin kabul, depolama, ikmal, sipariş toplama ve sevkiyat operasyonlarını merkezi bir WMS yaklaşımıyla yönetmektir. Arayüz, fiziksel depo faaliyetlerinin 3B dijital ikiz ortamında görselleştirilmesini ve NFC/barkod olaylarıyla tetiklenmesini sağlar.</p></section><section><span className="report-index">02 / DEPO TASARIMI</span><h3>Depo türü ve lokasyon yaklaşımı</h3><p>Özel depo, merkezi dağıtım deposu ve C Tipi Özel Antrepo yaklaşımı; talep sürekliliği, Türkiye geneli dağıtım ve gümrüklü stok gereksinimleri temelinde birlikte değerlendirilmiştir. Antrepo uygulaması gerçek operasyonda ilgili gümrük mevzuatı, izin ve yetkilendirmeler çerçevesinde yürütülmelidir.</p></section><section><span className="report-index">03 / DEPOLAMA TEKNOLOJİSİ</span><h3>Drive-In raf sistemi ve ekipman filosu</h3><p>Drive-In rafların yüksek hacimsel yoğunluğu büyük ebatlı beyaz eşya paletleri için avantaj sağlar. Forklift, akülü istif makinesi ve turret truck görev bazlı konumlandırılır. Raf kapasitesi, koridor ölçüsü, palet uyumu, yangın ve iş güvenliği tasarım aşamasında doğrulanmalıdır.</p></section><section><span className="report-index">04 / OPERASYON</span><h3>Altı aşamalı malzeme akışı</h3><div className="report-steps">{OPERATIONS.map((item) => <div key={item.id}><b>{item.number}</b><span><strong>{item.name}</strong><small>{item.detail}</small></span></div>)}</div></section><section><span className="report-index">05 / DİJİTALLEŞME</span><h3>WMS, NFC, webhook ve tersine lojistik</h3><p>Barkod ve seri numarası eşleşmesi stok doğruluğunu destekler. NFC etiketleri HTTPS URL üzerinden operasyon tetikleyicisi olarak kullanılır; sunucu olayı ntfy üzerinden dağıtır. Tersine lojistikte iade kabul, barkod doğrulama, hasar sınıflandırma ve kalite kararı aşamaları izlenir. Karanlık depo modu, 7/24 otonom çalışma senaryosunu simüle eder.</p></section><section><span className="report-index">06 / SONUÇ</span><h3>Beklenen kazanımlar</h3><p>Depo adres doğruluğu, daha düşük manuel işlem hatası, stok görünürlüğü, ikmal sürekliliği, güvenli ekipman rotası ve sevkiyat izlenebilirliği hedeflenmektedir. Simülasyondaki performans KPI'ları sunum amaçlı örnek değerlerdir; gerçek ölçüm için WMS/ERP ve sensör verileriyle beslenmelidir.</p></section><div className="report-references"><b>KAYNAK NOTLARI</b><p>[1] Kullanıcı tarafından sağlanan 6 adımlı depo operasyon planı ve dijitalleşme notları.</p><p>[2] Kullanıcı tarafından sağlanan depo türü, raf sistemi ve ekipman seçimi notları.</p><p className="report-disclaimer">Not: Bu rapor, ders ödevi için hazırlanmış kavramsal tasarım dokümanıdır. Gerçek antrepo işletimi ve iş güvenliği için yetkili kurum ve uzman onayı gerekir.</p></div></div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={cx('toast', toast.type)}><CheckCircle2 size={16} /><span>{toast.message}</span></div>;
}

function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}><div className="help-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">SYSTEM GUIDE</span><h2>Bağlantı ve kullanım notları</h2></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div><div className="help-content"><div><b>1. NFC / iPhone</b><p>NFC etiketi, HTTPS /nfc?step=auto&key=... URL'sini taşımalıdır. Etiket okutulduğunda sunucu ntfy kanalına olay gönderir. Web NFC API iPhone Safari'de desteklenmez; URL tabanlı akış kullanılır.</p></div><div><b>2. ntfy</b><p>Sunucuda NTFY_TOPIC ve NFC_SHARED_SECRET tanımlayın. Topic herkese açık olabileceğinden tahmin edilmesi zor bir isim seçin; gizli veri göndermeyin.</p></div><div><b>3. iPhone ekranı</b><p>QR kodu telefonda açın ve Ekranımı Paylaş düğmesine basın. Ekran yakalama için HTTPS ve destekleyen iOS/Safari sürümü gerekir. Ağlar arası bağlantıda TURN sunucusu gerekebilir.</p></div><div><b>4. Demo verileri</b><p>KPI, stok ve görev kayıtları örnek veridir. Gerçek sisteme geçiş için ERP/WMS API, yetkilendirme, cihaz kimliği ve olay güvenliği eklenmelidir.</p></div></div><button className="primary-action full-width" onClick={onClose}>ANLADIM <Check size={15} /></button></div></div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isPhoneSender = params.get('mode') === 'phone';
  const [activeModule, setActiveModule] = useState('control');
  const [activeStep, setActiveStep] = useState(-1);
  const [runToken, setRunToken] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [topic, setTopic] = useState('bosch_grup3_nfc_depo');
  const [tagKey, setTagKey] = useState('');
  const [mirrorRoom, setMirrorRoom] = useState('bosch-wms-grup3');
  const [mirrorStatus, setMirrorStatus] = useState('standby');
  const [toast, setToast] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [events, setEvents] = useState([]);
  const [nfcConfig, setNfcConfig] = useState({ secretConfigured: false });
  const mirrorVideoRef = useRef(null);
  const mirrorPcRef = useRef(null);
  const mirrorWsRef = useRef(null);
  const autoTimer = useRef(null);
  const toastTimer = useRef(null);
  const seenEvents = useRef(new Set());

  const addEvent = useCallback((kind, title, detail) => {
    setEvents((current) => [{ id: `${Date.now()}-${Math.random()}`, kind, title, detail, time: formatTime() }, ...current].slice(0, 24));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3100);
  }, []);

  const triggerOperation = useCallback((index, origin = 'dashboard') => {
    const safeIndex = Math.max(0, Math.min(5, index));
    setActiveStep(safeIndex);
    setRunToken((value) => value + 1);
    setCompleted((current) => Array.from(new Set([...current, ...OPERATIONS.slice(0, safeIndex).map((item) => item.id)])));
    playConfirmationTone();
    const operation = OPERATIONS[safeIndex];
    addEvent(origin === 'nfc' ? 'nfc' : origin === 'scan' ? 'scan' : 'system', `${operation.name} tetiklendi`, `${origin === 'nfc' ? 'iPhone NFC' : origin === 'scan' ? 'Barkod okuyucu' : 'Kontrol odası'} · ${operation.area}`);
    showToast(`${operation.number} / ${operation.name} operasyonu başlatıldı.`);
  }, [addEvent, showToast]);

  const nextOperation = useCallback((origin = 'dashboard') => {
    const next = activeStep < 0 ? 0 : (activeStep + 1) % 6;
    if (activeStep === 5) setCompleted([]);
    triggerOperation(next, origin);
  }, [activeStep, triggerOperation]);

  const onExternalNfc = useCallback((payload) => {
    const nonce = safeText(payload.nonce, `${Date.now()}`);
    if (seenEvents.current.has(nonce)) return;
    seenEvents.current.add(nonce);
    if (seenEvents.current.size > 100) seenEvents.current = new Set([...seenEvents.current].slice(-50));
    const requestedStep = stepFromMessage(payload.step);
    if (requestedStep < 0) nextOperation('nfc');
    else triggerOperation(requestedStep, 'nfc');
  }, [nextOperation, triggerOperation]);

  const ntfy = useNtfyBridge(topic, onExternalNfc);

  useEffect(() => {
    fetch('/api/config').then((response) => response.ok ? response.json() : null).then((config) => {
      if (!config) return;
      if (config.ntfyTopic) setTopic(config.ntfyTopic);
      if (config.mirrorRoom) setMirrorRoom(config.mirrorRoom);
      setNfcConfig({ secretConfigured: Boolean(config.nfcSecretConfigured) });
    }).catch(() => {});
    return () => {
      window.clearTimeout(toastTimer.current);
      window.clearInterval(autoTimer.current);
    };
  }, []);

  useEffect(() => {
    if (params.get('nfc') === 'accepted') showToast('iPhone NFC etiketi okundu. Olay ntfy kanalına gönderildi.');
  }, []);

  useEffect(() => () => {
    mirrorPcRef.current?.close();
    mirrorWsRef.current?.close();
  }, []);

  const startAutoRun = () => {
    if (autoRunning) {
      window.clearInterval(autoTimer.current);
      setAutoRunning(false);
      return;
    }
    setAutoRunning(true);
    let count = 0;
    const play = () => {
      triggerOperation(count % 6, 'dashboard');
      count += 1;
      if (count >= 6) {
        window.clearInterval(autoTimer.current);
        setAutoRunning(false);
      }
    };
    play();
    autoTimer.current = window.setInterval(play, 3600);
  };

  const stopMirror = () => {
    mirrorPcRef.current?.close();
    mirrorWsRef.current?.close();
    mirrorPcRef.current = null;
    mirrorWsRef.current = null;
    if (mirrorVideoRef.current) mirrorVideoRef.current.srcObject = null;
    setMirrorStatus('standby');
  };

  const startMirror = () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      showToast('Ekran yansıtma için HTTPS bağlantısı gereklidir.', 'error');
      return;
    }
    if (mirrorWsRef.current) stopMirror();
    setMirrorStatus('pairing');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/signal`);
    mirrorWsRef.current = socket;
    let peer = null;
    let queuedCandidates = [];
    const ensurePeer = () => {
      if (peer) return peer;
      peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      mirrorPcRef.current = peer;
      peer.ontrack = (event) => {
        if (mirrorVideoRef.current) {
          mirrorVideoRef.current.srcObject = event.streams[0];
          mirrorVideoRef.current.play().catch(() => {});
        }
        setMirrorStatus('connected');
      };
      peer.onicecandidate = (event) => {
        if (event.candidate && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'signal', signal: { candidate: event.candidate } }));
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') setMirrorStatus('connected');
        if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) setMirrorStatus('disconnected');
      };
      return peer;
    };
    socket.onopen = () => socket.send(JSON.stringify({ type: 'join', room: mirrorRoom, role: 'viewer' }));
    socket.onmessage = async (event) => {
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      try {
        if (packet.type === 'peer-joined' && packet.role === 'sender') {
          const pc = ensurePeer();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.send(JSON.stringify({ type: 'signal', signal: { description: pc.localDescription } }));
        }
        if (packet.type === 'signal' && packet.role === 'sender') {
          const pc = ensurePeer();
          if (packet.signal?.description) {
            await pc.setRemoteDescription(packet.signal.description);
            const queued = queuedCandidates.splice(0);
            for (const candidate of queued) await pc.addIceCandidate(candidate);
          } else if (packet.signal?.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(packet.signal.candidate);
            else queuedCandidates.push(packet.signal.candidate);
          }
        }
        if (packet.type === 'peer-left') setMirrorStatus('pairing');
      } catch (error) { showToast(`Ekran bağlantısı kurulamadı: ${error.message}`, 'error'); }
    };
    socket.onerror = () => { setMirrorStatus('error'); showToast('Eşleştirme sunucusuna ulaşılamadı.', 'error'); };
    socket.onclose = () => { if (mirrorStatus !== 'connected') setMirrorStatus('standby'); };
    showToast('Eşleştirme odası açıldı. QR kodunu iPhone ile tarayın.');
  };

  const pairingUrl = useMemo(() => `${window.location.origin}/?mode=phone&room=${encodeURIComponent(mirrorRoom)}`, [mirrorRoom]);

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); showToast('Panoya kopyalandı.'); }
    catch { showToast('Kopyalama için tarayıcı izni gerekli.', 'error'); }
  };

  const handleBarcodeScan = () => {
    setBarcodeMode(true);
    addEvent('scan', 'Lazer barkod taraması', 'İade ürünü · seri numarası doğrulandı · kalite kapısı açıldı');
    showToast('İade barkodu okundu. Kalite kontrol akışı başlatıldı.');
    triggerOperation(4, 'scan');
    window.setTimeout(() => setBarcodeMode(false), 2400);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => showToast('Tam ekran bu tarayıcıda kullanılamıyor.', 'error'));
    else document.exitFullscreen?.();
  };

  if (isPhoneSender) return <PhoneSender room={params.get('room') || 'bosch-wms-grup3'} />;

  return (
    <div className="app-shell">
      <TopBar darkMode={darkMode} setDarkMode={setDarkMode} ntfyStatus={ntfy.status} onFullscreen={toggleFullscreen} onOpenHelp={() => setShowHelp(true)} />
      <div className="app-body">
        <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} onReport={() => setActiveModule('report')} />
        <main className="main-content">
          {activeModule === 'control' && <ControlRoom activeStep={activeStep} runToken={runToken} darkMode={darkMode} setDarkMode={setDarkMode} barcodeMode={barcodeMode} setBarcodeMode={setBarcodeMode} onSelectStep={(index) => triggerOperation(index)} onNext={() => nextOperation()} onAutoRun={startAutoRun} autoRunning={autoRunning} />}
          {activeModule === 'inventory' && <InventoryModule />}
          {activeModule === 'academy' && <AcademyModule />}
          {activeModule === 'report' && <ReportModule onPrint={() => window.print()} />}
          {activeModule === 'control' && <button className="reverse-logistics-fab" onClick={handleBarcodeScan}><ScanLine size={15} /><span>TERSİNE LOJİSTİK<br /><b>İADE BARKODU TARA</b></span><ChevronRight size={14} /></button>}
        </main>
        <RightRail activeStep={activeStep} onNext={() => nextOperation()} onSelectStep={(index) => triggerOperation(index)} ntfy={ntfy} topic={topic} setTopic={setTopic} lastSeen={ntfy.lastSeen} tagKey={tagKey} setTagKey={setTagKey} secretConfigured={nfcConfig.secretConfigured} mirrorStatus={mirrorStatus} mirrorRoom={mirrorRoom} videoRef={mirrorVideoRef} onStartMirror={startMirror} onStopMirror={stopMirror} pairingUrl={pairingUrl} onCopy={copyText} events={events} onClearEvents={() => setEvents([])} />
      </div>
      <footer className="app-footer"><div><span className="footer-led" /> SYSTEM NOMINAL <span className="footer-divider" /> WMS CORE / DIGITAL TWIN ENGINE</div><div><span>API BRIDGE: {ntfy.status === 'connected' ? 'CONNECTED' : 'LOCAL MODE'}</span><span className="footer-divider" /><span>ENCRYPTED SESSION <LockKeyhole size={11} /></span><span className="footer-divider" /><span>BUILD 1.0.4</span></div></footer>
      <Toast toast={toast} />
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
