---
name: machine-skill
description: Cria simulações 3D interativas de máquinas e equipamentos (esteiras, empilhadeiras, reach trucks, paleteiras, sorters, prensas, robôs, AGVs) como uma página HTML autônoma com Three.js. Use quando o usuário pedir para "simular", "visualizar em 3D", "animar" ou "ver funcionando" uma máquina ou equipamento — inclusive os do catálogo do ARGUS.LLP (forklift, reach-truck, conveyor, tug, order-picker…).
---

# machine-skill — simulação 3D de uma máquina

Gera **uma** máquina em 3D, com suas partes móveis animadas e controles para operá-la.
O resultado é um arquivo HTML autônomo em `simulations/machines/<slug>.html`.

> Regra do produto (docs/PRODUCT.md): o editor do ARGUS.LLP é e continua 2D. Simulações 3D são
> uma camada **separada**: nunca adicione Three.js ao bundle de `src/` nem transforme a
> prancheta em 3D. Estas páginas vivem fora do app.

## 1. Entender a máquina

Antes de escrever código, defina (pergunte só o que não dá para inferir):

- **Tipo** e, se vier do catálogo, o `objectType` correspondente em `src/types/layout.ts`.
- **Dimensões reais** em metros (largura × comprimento × altura). Do Layout, `width`/`length`
  estão em **centímetros** — divida por 100.
- **Partes móveis e graus de liberdade**: ex. empilhadeira = rodas (rotação), mastro (inclinação),
  garfos (translação vertical, 0–altura máx.); esteira = roletes + itens transportados.
- **Parâmetros operacionais**: velocidade (m/s), aceleração, capacidade (kg), tempo de ciclo.
  Prefira dados do usuário; senão use valores típicos e liste-os como premissas na página.

## 2. Construir

Página única, sem build. Three.js via CDN fixo:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
} }
</script>
```

Estrutura obrigatória:

1. **Unidade = metro**, Y para cima, chão em y = 0 com `GridHelper` de 1 m.
2. **Hierarquia de `Group`s** espelhando a cinemática: cada parte móvel é um grupo com o pivô na
   articulação real (ex. `mast → carriage → forks`). Nunca anime vértices.
3. **Primitivas** (`BoxGeometry`, `CylinderGeometry`, `ExtrudeGeometry`) com `MeshStandardMaterial`;
   cores do design system quando houver (`FLOW_CONNECTION_STYLE`, `AREA_TYPE_COLORS` em
   `src/shared/lib/colors.ts`). Sem modelos externos.
4. **Estado separado da renderização**: um objeto `state` (posição, velocidade, alturas, carga)
   atualizado em `step(dt)` com `dt` de `THREE.Clock`, limitado a 0.05 s. A malha só lê o estado.
5. **Limites físicos**: clamp de curso, velocidade máxima, aceleração; nada atravessa o chão.
6. **Controles**: `OrbitControls` para câmera + painel HTML com sliders/botões (velocidade,
   play/pause, reset, comandos da máquina) e atalhos de teclado documentados no painel.
7. **Telemetria**: HUD com os valores do `state` (velocidade, altura do garfo, ciclos, tempo).
8. Luz ambiente + direcional com sombras, `renderer.setPixelRatio(min(devicePixelRatio, 2))`,
   resize responsivo, funciona em largura de celular.

## 3. Verificar

- Abra a página com Playwright (Chromium em `/opt/pw-browsers`), capture um screenshot e
  confira que não há erros no console e que a máquina aparece e se move.
- Revise: escala plausível ao lado de uma pessoa de 1,75 m (adicione um boneco de referência
  opcional), partes giram no eixo certo, limites respeitados.

## 4. Entregar

Informe o caminho do arquivo, as premissas usadas e os controles. Se o usuário quiser
compartilhar, publique como Artifact.
