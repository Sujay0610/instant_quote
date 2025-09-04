## 🚀 MVP Tech Stack

### 1. **Frontend (UI & 3D Viewer)**

* **Framework**: Next.js (React-based, SEO-friendly, server-side rendering).
* **Styling**: Tailwind CSS (fast UI building).
* **3D Rendering**: React Three Fiber (R3F) + Drei helpers.

  * STL/OBJ/GLTF rendering support.
  * OrbitControls for zoom/rotate/pan.
* **File Upload**: Next.js API routes + Dropzone component.

**MVP Features:**

* Drag-and-drop file upload.
* Preview model in 3D viewer.
* Show bounding box overlay (dimensions).
* Display metadata (file size, units, triangle count).

---

### 2. **Backend (File Parsing & Processing)**

* **Language**: Python (best for CAD/geometry processing).
* **Framework**: FastAPI (lightweight, async, integrates well with Next.js via API routes).
* **Geometry Libraries**:

  * `trimesh` → volume, surface area, bounding box, repair meshes.
  * `numpy-stl` → STL parsing.
  * `pythonOCC-core` → STEP/IGES parsing.
  * `meshio` → format conversions.
* **Conversion Service**:

  * STEP/IGES/3MF → STL/GLTF (so frontend can render easily).

**MVP Features:**

* Receive uploaded file.
* Parse geometry.
* Return metadata (volume, area, bounding box).
* Convert to STL/GLTF and return to frontend.

---

### 3. **Storage & Infrastructure**

* **File Storage**: Local (dev) → AWS S3 (production).
* **Database** (later for quoting/orders): PostgreSQL.
* **Server/Hosting**:

  * Frontend: Netlify (Next.js optimized).
  * Backend: DigitalOcean (FastAPI container).
  * File processing can run in Docker for reproducibility.

**MVP Features:**

* Temporary file storage (auto-delete after X hours).
* Direct file streaming to frontend for rendering.

---

### 4. **Quoting Engine (Later Phase)**

* Formula-based pricing service.
* Configurable rates for:

  * Material cost per cm³.
  * Machine time (estimated from volume/layer height).
  * Post-processing options.
* Database integration for pricing rules & materials.
* User accounts, order management, payments.

---

## 📂 Project Structure

```
/3d-quote-app
  /frontend (Next.js + R3F)
    /components
      - FileUpload.js
      - ModelViewer.js
      - MetadataCard.js
  /backend (FastAPI + Python)
    /services
      - geometry_parser.py
      - converter.py
    /routes
      - upload.py
      - analyze.py
  /storage
    - local (dev)
    - S3 bucket config (prod)
```

---

## 🛠️ MVP Development Roadmap

**Phase 1: File Upload & Viewer**

* [ ] Build Next.js upload UI (drag & drop).
* [ ] Send file to backend.
* [ ] Convert file → STL if needed.
* [ ] Render STL in browser with R3F.

**Phase 2: Geometry Extraction**

* [ ] Extract bounding box, volume, surface area.
* [ ] Return metadata to frontend.
* [ ] Display info alongside viewer.

**Phase 3: Infrastructure**

* [ ] Add S3 storage for uploaded files.
* [ ] Auto-delete old files.
* [ ] Deploy frontend (Vercel) + backend (AWS/GCP).

**Phase 4 (Future): Instant Quote Engine**

* [ ] Define cost formulas.
* [ ] Add pricing DB.
* [ ] Implement material/process selection.
* [ ] Payment & order system.

---

