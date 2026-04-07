// ─── Charts Helper para NogueraRRHH ─────────────
const Charts = {

  // Colores por módulo
  colors: {
    contrato:         { bg: 'rgba(250,236,231,0.7)', border: '#e8937a' },
    seguridad_social: { bg: 'rgba(225,245,238,0.7)', border: '#5cb89a' },
    horario:          { bg: 'rgba(230,225,251,0.7)', border: '#8b7dd8' },
    salario:          { bg: 'rgba(241,239,232,0.7)', border: '#b8a97a' },
    vacaciones:       { bg: 'rgba(255,243,224,0.7)', border: '#e8a84c' },
    aguinaldo:        { bg: 'rgba(232,245,253,0.7)', border: '#5ba3d9' },
  },

  // Donut de cumplimiento general
  cumplimientoDonut(canvasId, resumen) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const comp = resumen.total_general?.pasos_completados || 0;
    const falt = resumen.total_general?.pasos_faltantes || 0;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Cumplidos', 'Faltantes'],
        datasets: [{
          data: [comp, falt],
          backgroundColor: ['#5cb89a', '#e85d4a'],
          borderWidth: 2,
          borderColor: 'var(--bg-primary)',
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: 'var(--text-primary)', padding: 16 } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.raw} pasos`
            }
          }
        }
      }
    });
  },

  // Barras por submódulo
  cumplimientoBarras(canvasId, resumen) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const modulos = ['contrato', 'seguridad_social', 'horario', 'salario', 'vacaciones', 'aguinaldo'];
    const labels = ['Contrato', 'Seg. Social', 'Horario', 'Salario', 'Vacaciones', 'Aguinaldo'];

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Cumplidos',
            data: modulos.map(m => resumen[m]?.pasos_completados || 0),
            backgroundColor: modulos.map(m => Charts.colors[m]?.bg || '#ccc'),
            borderColor: modulos.map(m => Charts.colors[m]?.border || '#999'),
            borderWidth: 2,
          },
          {
            label: 'Faltantes',
            data: modulos.map(m => resumen[m]?.pasos_faltantes || 0),
            backgroundColor: 'rgba(232,93,74,0.3)',
            borderColor: '#e85d4a',
            borderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, color: 'var(--text-secondary)' }, grid: { color: 'var(--border-color)' } },
          x: { ticks: { color: 'var(--text-secondary)' }, grid: { display: false } }
        },
        plugins: {
          legend: { labels: { color: 'var(--text-primary)' } }
        }
      }
    });
  },

  // Radar de cumplimiento
  cumplimientoRadar(canvasId, resumen) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const modulos = ['contrato', 'seguridad_social', 'horario', 'salario', 'vacaciones', 'aguinaldo'];
    const labels = ['Contrato', 'Seg. Social', 'Horario', 'Salario', 'Vacaciones', 'Aguinaldo'];

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: '% Cumplimiento',
          data: modulos.map(m => resumen[m]?.porcentaje || 0),
          backgroundColor: 'rgba(92,184,154,0.2)',
          borderColor: '#5cb89a',
          pointBackgroundColor: modulos.map(m => Charts.colors[m]?.border || '#5cb89a'),
          borderWidth: 2,
          pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 25, color: 'var(--text-secondary)' },
            grid: { color: 'var(--border-color)' },
            pointLabels: { color: 'var(--text-primary)', font: { size: 12 } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  // Barras de ahorro aguinaldo por mes
  ahorroAguinaldoBarras(canvasId, datosAhorro) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mesesKeys = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

    const datasets = datosAhorro.map((emp, i) => ({
      label: emp.nombre_apellido,
      data: mesesKeys.map(m => emp.ahorros?.[m] || 0),
      backgroundColor: `hsla(${(i * 60) % 360}, 60%, 65%, 0.6)`,
      borderColor: `hsla(${(i * 60) % 360}, 60%, 45%, 1)`,
      borderWidth: 1,
    }));

    return new Chart(ctx, {
      type: 'bar',
      data: { labels: meses, datasets },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border-color)' } },
          x: { ticks: { color: 'var(--text-secondary)' }, grid: { display: false } },
        },
        plugins: {
          legend: { labels: { color: 'var(--text-primary)' } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('es-PY')} Gs.`
            }
          }
        }
      }
    });
  },

  // Destruir un chart para recrearlo
  destroy(chart) {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  }
};
