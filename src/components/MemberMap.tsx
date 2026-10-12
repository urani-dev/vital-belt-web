import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { MemberRow } from "../hooks/useDashboard";
import type { Area, Operation } from "../domain/types";
import { CATEGORY_LABEL, gpsText, relativeTime } from "../domain/labels";
import { useUi } from "../store/ui";
import { CATEGORY_HEX, Dot, Panel } from "./ui";
import { RELOCATE_DISTANCE_M } from "../data/demoRoster";

const MAP_ZOOM = 16;
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SELECTED_Z_OFFSET = 1000;
/** Dữ liệu không có bán kính sai số GPS → vòng nét đứt "vị trí cũ" dùng bán kính cố định. */
const STALE_RING_RADIUS_M = 30;
const FIT_PADDING_PX: L.PointTuple = [36, 36];

function pinIcon(row: MemberRow, selected: boolean, ageLabel: string | null): L.DivIcon {
  const color = CATEGORY_HEX[row.category];
  const age = ageLabel ? `<span class="vb-pin-age">${ageLabel}</span>` : "";
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="position:relative"><div class="vb-pin${selected ? " vb-pin--selected" : ""}" style="background:${color}">${Number(row.member.no)}</div>${age}</div>`,
  });
}

interface LeafletMapProps {
  rows: MemberRow[];
  /** Vị trí mặc định khi chưa có tọa độ thật. */
  fallbackCenter: [number, number];
  /** Tọa độ người thật (kênh 5005); bản đồ canh theo điểm này. */
  anchor: [number, number] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: boolean;
  now: number;
}

/**
 * Bản đồ Leaflet thuần (BSD-2-Clause). Là component riêng để mount/unmount cùng thẻ div:
 * khi panel thu gọn rồi mở lại, bản đồ được tạo lại trên thẻ div mới.
 * Production dự kiến thay bằng Google Maps JavaScript API — xem docs/PRODUCTION-CONFIRM.md mục 1.1.
 */
function LeafletMap({ rows, fallbackCenter, anchor, selectedId, onSelect, expanded, now }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const centeredOn = useRef<L.LatLng | null>(null);
  const [lat, lng] = fallbackCenter;

  // Khởi tạo bản đồ (Leaflet thuần, giấy phép BSD-2-Clause). Gỡ khi panel thu gọn / rời trang.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: MAP_ZOOM,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomControl: false,
    });
    // Nút zoom đặt góc phải để không che nhãn 「GPS 位置」 ở góc trái.
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION }).addTo(map);
    // Bỏ tiền tố "Leaflet" (không bắt buộc). Dòng © OpenStreetMap bắt buộc theo giấy phép ODbL — không được ẩn.
    L.control.attribution({ prefix: false }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      centeredOn.current = null;
    };
  }, [lat, lng]);

  // Lần đầu có tọa độ thật: khung bản đồ vừa đủ mọi pin. Sau đó chỉ canh lại khi người thật dời đi rất xa,
  // để người dùng kéo/zoom bản đồ không bị giật về mỗi giây.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [anchorLat, anchorLng] = anchor ?? [null, null];
  useEffect(() => {
    const map = mapRef.current;
    if (!map || anchorLat === null || anchorLng === null) return;
    const target = L.latLng(anchorLat, anchorLng);
    // Cùng ngưỡng với demoRoster: khi canh lại thì vị trí đứng yên của người demo cũng đã dời theo.
    if (centeredOn.current && centeredOn.current.distanceTo(target) < RELOCATE_DISTANCE_M) return;
    const points = rowsRef.current.flatMap(({ member: { location } }) =>
      location.lat !== null && location.lng !== null ? [L.latLng(location.lat, location.lng)] : [],
    );
    map.fitBounds(L.latLngBounds(points.length > 0 ? points : [target]), { padding: FIT_PADDING_PX, maxZoom: MAP_ZOOM });
    centeredOn.current = target;
  }, [anchorLat, anchorLng, lat, lng]);

  // Vẽ lại pin khi dữ liệu, người được chọn hoặc thời gian ("N 分前") thay đổi.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const row of rows) {
      const { location } = row.member;
      if (location.lat === null || location.lng === null) continue;
      const position: L.LatLngTuple = [location.lat, location.lng];
      const isSelected = row.member.id === selectedId;
      if (row.locationState !== "fresh") {
        L.circle(position, {
          radius: STALE_RING_RADIUS_M,
          color: CATEGORY_HEX[row.category],
          dashArray: "4 4",
          weight: 1.5,
          fillOpacity: 0.05,
        }).addTo(layer);
      }
      const ageLabel = row.locationState === "fresh" ? null : relativeTime(location.updatedAt, now);
      L.marker(position, {
        icon: pinIcon(row, isSelected, ageLabel),
        title: row.member.name,
        zIndexOffset: isSelected ? SELECTED_Z_OFFSET : 0,
      })
        .on("click", () => onSelect(row.member.id))
        .addTo(layer);
    }
  }, [rows, selectedId, now, onSelect]);

  // Leaflet cần tính lại kích thước khi đổi chế độ phóng to.
  useEffect(() => {
    mapRef.current?.invalidateSize();
  }, [expanded]);

  return <div ref={containerRef} className="h-full w-full" />;
}

interface Props {
  rows: MemberRow[];
  operation: Operation;
  areas: Area[];
  now: number;
}

/** F3 — メンバーの位置. */
export function MemberMap({ rows, operation, areas, now }: Props) {
  const selectedId = useUi((s) => s.selectedMemberId);
  const select = useUi((s) => s.selectMember);
  const [expanded, setExpanded] = useState(false);
  const counts = useMemo(() => {
    const c = { priority: 0, caution: 0, normal: 0 };
    for (const r of rows) c[r.category] += 1;
    return c;
  }, [rows]);
  const selected = rows.find((r) => r.member.id === selectedId);
  const realLocation = rows.find((r) => !r.member.isDemo)?.member.location;
  const anchor: [number, number] | null =
    realLocation && realLocation.lat !== null && realLocation.lng !== null ? [realLocation.lat, realLocation.lng] : null;

  const areaName = (id: string | null) => areas.find((a) => a.id === id);

  return (
    <Panel
      id="map"
      title="メンバーの位置"
      subtitle={operation.centerLabel}
      action={
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md border border-line px-2 py-1 text-[11px] hover:bg-subtle"
        >
          {expanded ? "縮小" : "拡大"}
        </button>
      }
    >
      <div className={`relative overflow-hidden rounded-lg ${expanded ? "h-[560px]" : "h-[300px]"}`}>
        <span className="absolute top-2 left-2 z-[500] rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-muted">GPS 位置</span>
        <LeafletMap
          rows={rows}
          fallbackCenter={operation.center}
          anchor={anchor}
          selectedId={selectedId}
          onSelect={select}
          expanded={expanded}
          now={now}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1"><Dot category="priority" />{CATEGORY_LABEL.priority} {counts.priority}</span>
        <span className="flex items-center gap-1"><Dot category="caution" />{CATEGORY_LABEL.caution} {counts.caution}</span>
        <span className="flex items-center gap-1"><Dot category="normal" />{CATEGORY_LABEL.normal} {counts.normal}</span>
        <span>┄ 破線：最終位置</span>
      </div>
      {selected && (
        <p className="mt-2 border-t border-line pt-2 text-xs">
          <span className="mr-2 text-muted">{selected.member.no}</span>
          <b>{selected.member.name}</b>
          <span className={selected.category === "priority" ? "text-priority" : "text-muted"}>
            ・{CATEGORY_LABEL[selected.category]}
          </span>
          <span className="ml-2 text-muted">
            {selected.locationState === "unknown"
              ? `現在地不明・最終確認 ${areaName(selected.member.location.lastKnownAreaId)?.code ?? ""}`
              : areaName(selected.member.location.areaId)?.code}
            ・{gpsText(selected.member.location, now)}
          </span>
        </p>
      )}
    </Panel>
  );
}
