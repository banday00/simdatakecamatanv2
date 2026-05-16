import "server-only";

import { pool } from "@/db/client";
import type { FacilityItem, GisLayer } from "@/components/map/map-config";

export type MapLayerRow = Record<string, unknown> & GisLayer & {
    tenant_id: string;
    created_at: string;
};

export type MapPoiRow = Record<string, unknown> & {
    id: string;
    tenant_id: string;
    kelurahan_id: string | null;
    nama: string;
    kategori: string;
    deskripsi: string | null;
    koordinat_lat: number;
    koordinat_lng: number;
    alamat: string | null;
    foto: string | null;
    created_at: string;
};

const layerColumns = "id, tenant_id, nama, jenis, geojson, style, is_visible, urutan, created_at";
const poiColumns = "id, tenant_id, kelurahan_id, nama, kategori, deskripsi, koordinat_lat::float8 AS koordinat_lat, koordinat_lng::float8 AS koordinat_lng, alamat, foto, created_at";

export async function listMapLayers(tenantId: string, visibleOnly = false) {
    const result = await pool.query<MapLayerRow>(
        `SELECT ${layerColumns}
         FROM gis_layers
         WHERE tenant_id = $1${visibleOnly ? " AND is_visible = true" : ""}
         ORDER BY urutan ASC, created_at DESC`,
        [tenantId]
    );

    return result.rows;
}

export async function getMapLayer(id: string, tenantId: string) {
    const result = await pool.query<MapLayerRow>(
        `SELECT ${layerColumns}
         FROM gis_layers
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createMapLayer(tenantId: string, payload: Record<string, unknown>) {
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<MapLayerRow>(
        `INSERT INTO gis_layers (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${layerColumns}`,
        values
    );

    return result.rows[0];
}

export async function updateMapLayer(id: string, tenantId: string, payload: Record<string, unknown>) {
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<MapLayerRow>(
        `UPDATE gis_layers
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${layerColumns}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteMapLayer(id: string, tenantId: string) {
    const result = await pool.query<MapLayerRow>(
        `DELETE FROM gis_layers
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${layerColumns}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function listMapPoi(tenantId: string, kelurahanId?: string | null) {
    const values: unknown[] = [tenantId];
    const where = ["tenant_id = $1"];

    if (kelurahanId) {
        values.push(kelurahanId);
        where.push(`kelurahan_id = $${values.length}`);
    }

    const result = await pool.query<MapPoiRow>(
        `SELECT ${poiColumns}
         FROM gis_poi
         WHERE ${where.join(" AND ")}
         ORDER BY created_at DESC, nama ASC`,
        values
    );

    return result.rows;
}

export async function getMapPoi(id: string, tenantId: string) {
    const result = await pool.query<MapPoiRow>(
        `SELECT ${poiColumns}
         FROM gis_poi
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function createMapPoi(tenantId: string, payload: Record<string, unknown>) {
    const fields = Object.keys(payload);
    const columns = ["tenant_id", ...fields];
    const values = [tenantId, ...fields.map((field) => payload[field])];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    const result = await pool.query<MapPoiRow>(
        `INSERT INTO gis_poi (${columns.join(", ")})
         VALUES (${placeholders})
         RETURNING ${poiColumns}`,
        values
    );

    return result.rows[0];
}

export async function updateMapPoi(id: string, tenantId: string, payload: Record<string, unknown>) {
    const fields = Object.keys(payload);
    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => payload[field]);
    values.push(id, tenantId);

    const result = await pool.query<MapPoiRow>(
        `UPDATE gis_poi
         SET ${assignments.join(", ")}
         WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
         RETURNING ${poiColumns}`,
        values
    );

    return result.rows[0] ?? null;
}

export async function deleteMapPoi(id: string, tenantId: string) {
    const result = await pool.query<MapPoiRow>(
        `DELETE FROM gis_poi
         WHERE id = $1 AND tenant_id = $2
         RETURNING ${poiColumns}`,
        [id, tenantId]
    );

    return result.rows[0] ?? null;
}

export async function listMapFacilities(tenantId: string) {
    const [health, education, economy, religious, poi] = await Promise.all([
        pool.query<FacilityItem>(
            `SELECT hf.id, hf.nama, COALESCE(rjfk.nama, 'Fasilitas Kesehatan') AS jenis,
                    hf.alamat, hf.koordinat_lat::float8 AS koordinat_lat,
                    hf.koordinat_lng::float8 AS koordinat_lng, 'health' AS type
             FROM health_facilities hf
             LEFT JOIN ref_jenis_fasilitas_kesehatan rjfk ON rjfk.id = hf.jenis_id
             WHERE hf.tenant_id = $1 AND hf.koordinat_lat IS NOT NULL AND hf.koordinat_lng IS NOT NULL
             ORDER BY hf.nama ASC`,
            [tenantId]
        ),
        pool.query<FacilityItem>(
            `SELECT id, nama, jenjang AS jenis, NULL::text AS alamat,
                    koordinat_lat::float8 AS koordinat_lat, koordinat_lng::float8 AS koordinat_lng,
                    'edu' AS type
             FROM edu_facilities
             WHERE tenant_id = $1 AND koordinat_lat IS NOT NULL AND koordinat_lng IS NOT NULL
             ORDER BY nama ASC`,
            [tenantId]
        ),
        pool.query<FacilityItem>(
            `SELECT ef.id, ef.nama, COALESCE(res.nama, 'Sarana Ekonomi') AS jenis,
                    ef.alamat, ef.koordinat_lat::float8 AS koordinat_lat,
                    ef.koordinat_lng::float8 AS koordinat_lng, 'econ' AS type
             FROM econ_facilities ef
             LEFT JOIN ref_ekonomi_sarana res ON res.id = ef.jenis_id
             WHERE ef.tenant_id = $1 AND ef.koordinat_lat IS NOT NULL AND ef.koordinat_lng IS NOT NULL
             ORDER BY ef.nama ASC`,
            [tenantId]
        ),
        pool.query<FacilityItem>(
            `SELECT id, nama, jenis, alamat, lokasi, kapasitas,
                    koordinat_lat::float8 AS koordinat_lat, koordinat_lng::float8 AS koordinat_lng,
                    'religious' AS type
             FROM social_religious
             WHERE tenant_id = $1 AND koordinat_lat IS NOT NULL AND koordinat_lng IS NOT NULL
             ORDER BY nama ASC`,
            [tenantId]
        ),
        pool.query<FacilityItem>(
            `SELECT id, nama, kategori AS jenis, kategori, deskripsi, alamat, foto,
                    koordinat_lat::float8 AS koordinat_lat, koordinat_lng::float8 AS koordinat_lng,
                    'poi' AS type
             FROM gis_poi
             WHERE tenant_id = $1 AND koordinat_lat IS NOT NULL AND koordinat_lng IS NOT NULL
             ORDER BY nama ASC`,
            [tenantId]
        ),
    ]);

    return [
        ...health.rows,
        ...education.rows,
        ...economy.rows,
        ...religious.rows,
        ...poi.rows,
    ];
}

export async function kelurahanBelongsToTenant(kelurahanId: string, tenantId: string) {
    const result = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM kelurahans WHERE id = $1 AND tenant_id = $2 AND is_active = true
         ) AS exists`,
        [kelurahanId, tenantId]
    );

    return Boolean(result.rows[0]?.exists);
}
