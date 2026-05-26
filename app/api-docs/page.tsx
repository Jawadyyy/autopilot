'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null)

  useEffect(() => {
    fetch('/api/swagger')
      .then((res) => res.json())
      .then((data) => setSpec(data))
  }, [])

  if (!spec) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fff', fontFamily: 'Arial',
        fontSize: '18px', color: '#555'
      }}>
        Loading API docs...
      </div>
    )
  }

  return (
    <>
      <style>{`
        body { margin: 0; background: #fff !important; }
        .swagger-ui { background: #fff; }
        .swagger-ui .topbar { background: #1e3a5f; padding: 10px 0; }
        .swagger-ui .topbar .topbar-wrapper { justify-content: center; }
        .swagger-ui .topbar .topbar-wrapper a { display: none; }
        .swagger-ui .info .title { color: #1e3a5f; }
        .swagger-ui .scheme-container { background: #f8f9fa; box-shadow: none; border-bottom: 1px solid #e0e0e0; }
        .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #2e6da4; }
        .swagger-ui .opblock.opblock-get { background: #e8f0fb; border-color: #2e6da4; }
        .swagger-ui .opblock.opblock-post { background: #e6f4ea; border-color: #3c8a3c; }
        .swagger-ui .opblock.opblock-delete { background: #fce8e6; border-color: #c62828; }
        .swagger-ui .opblock.opblock-patch { background: #fff8e1; border-color: #f9a825; }
        .swagger-ui .btn.execute { background: #1e3a5f; border-color: #1e3a5f; }
        .swagger-ui .btn.execute:hover { background: #2e6da4; }
        .swagger-ui section.models { background: #f8f9fa; }
      `}</style>
      <div style={{ background: '#fff', minHeight: '100vh' }}>
        <SwaggerUI
          spec={spec}
          persistAuthorization={true}
          displayRequestDuration={true}
          defaultModelsExpandDepth={1}
          tryItOutEnabled={true}
        />
      </div>
    </>
  )
}