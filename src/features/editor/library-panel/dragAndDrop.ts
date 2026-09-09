/**
 * Tipo MIME usado no arrasto de um item da biblioteca até a prancheta. Fica num módulo próprio
 * porque as duas pontas do gesto vivem em componentes diferentes — LibraryPanel escreve o tipo
 * do objeto no dataTransfer, EditorCanvas lê no drop e insere naquele ponto exato do mundo.
 *
 * É drag & drop nativo do navegador (não Konva): funciona no desktop sem nenhuma dependência
 * nova. No toque, onde a API nativa não existe, o toque no item continua inserindo o objeto no
 * centro da viewport — os dois caminhos usam o mesmo `addObject`.
 */
export const LIBRARY_DND_MIME = 'application/x-fluxocit-object-type'
