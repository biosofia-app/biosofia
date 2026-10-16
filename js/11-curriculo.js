'use strict';
/* ---------- currículo LOMLOE (Comunitat Valenciana): competencias específicas y criterios de evaluación ---------- */
const CURR = {
  eso1: { nombre: 'Biología y Geología · 1.º ESO', corto: '1.º ESO', ce: [
    [1, 'Resolver problemas científicos a partir de trabajos de investigación experimental', [
      ['1.1', 'Aplicar correctamente las normas de seguridad propias del trabajo experimental'],
      ['1.2', 'Observar hechos, formular preguntas investigables y emitir hipótesis comprobables científicamente'],
      ['1.3', 'Realizar búsquedas de información y recogida de datos atendiendo a la validez y fiabilidad de las fuentes, de forma guiada'],
      ['1.4', 'Diseñar experimentos sencillos para comprobar hipótesis siguiendo las pautas del trabajo científico'],
      ['1.5', 'Elaborar informes sencillos de las investigaciones realizadas']]],
    [2, 'Analizar situaciones problemáticas reales con lógica científica', [
      ['2.1', 'Utilizar con acierto las herramientas informáticas necesarias para su trabajo de forma guiada'],
      ['2.2', 'Analizar críticamente la solución propuesta a un problema sencillo en función de los saberes básicos'],
      ['2.3', 'Utilizar el conocimiento científico adquirido para interpretar los fenómenos que ocurren a su alrededor']]],
    [3, 'Pensamiento crítico: interpretar y comunicar mensajes científicos y distinguir bulos', [
      ['3.1', 'Identificar hipótesis, pruebas y conclusiones en un discurso para distinguir una opinión de una afirmación basada en pruebas'],
      ['3.2', 'Conocer algunas fuentes objetivas, revisadas y fiables a las que acudir para recabar información'],
      ['3.3', 'Comunicarse de forma oral y escrita con lenguaje científico, interpretando o produciendo mensajes de nivel básico'],
      ['3.4', 'Utilizar fuentes de información variada para construir sus argumentaciones, con bajo grado de complejidad']]],
    [4, 'Validez del modelo científico y su contexto social e histórico', [
      ['4.1', 'Aportar ejemplos de utilización positiva y negativa del conocimiento científico'],
      ['4.2', 'Utilizar un lenguaje inclusivo conociendo aportaciones de las mujeres y de distintas culturas a la ciencia'],
      ['4.3', 'Aportar ejemplos de cambios sufridos por las teorías científicas con el tiempo'],
      ['4.4', 'Señalar algunos avances tecnológicos que han facilitado el desarrollo de la ciencia']]],
    [7, 'Conservación de todas las formas de vida y del planeta', [
      ['7.1', 'Explicar la actual biodiversidad como resultado de un proceso evolutivo'],
      ['7.2', 'Argumentar la necesidad de conservar todas las formas de vida y la interdependencia del ser humano con el resto de seres vivos'],
      ['7.3', 'Clasificar organismos según sus características, destacando el uso de claves dicotómicas'],
      ['7.4', 'Reconocer el significado del concepto de especie']]],
    [8, 'La Tierra como sistema: impacto en las poblaciones y actuaciones', [
      ['8.1', 'Analizar estructura y composición de minerales y rocas y sus aplicaciones en la vida cotidiana'],
      ['8.2', 'Analizar el Universo y el Sistema Solar e interpretar algunos fenómenos astronómicos'],
      ['8.3', 'Explicar los rasgos generales del relieve como consecuencia de los procesos geológicos'],
      ['8.4', 'Analizar e identificar las principales interacciones entre la humanidad y el planeta'],
      ['8.5', 'Argumentar la necesidad del uso sostenible de los recursos y los riesgos de su explotación'],
      ['8.6', 'Buscar y seleccionar información sobre procesos que afectan a la Tierra y valorar si las evidencias apoyan una conclusión'],
      ['8.7', 'Valorar los principios geológicos básicos y los procedimientos elementales de la Geología'],
      ['8.8', 'Analizar un fenómeno geológico identificando sus componentes, relaciones y funcionamiento como sistema']]],
    [9, 'Historia de la Tierra y tiempo geológico', [
      ['9.1', 'Apreciar la magnitud del tiempo geológico frente al histórico y al de una vida'],
      ['9.2', 'Reconocer evidencias de cambios en el registro de la Tierra y situarlos en un eje cronológico']]],
    [10, 'Hábitos responsables con el entorno', [
      ['10.1', 'Analizar el funcionamiento de los ecosistemas, sus impactos y la importancia de su preservación'],
      ['10.2', 'Interpretar datos técnicos sobre los problemas de la acción humana y la emergencia climática'],
      ['10.3', 'Describir las consecuencias de la pérdida de biodiversidad, la desertización y la migración climática'],
      ['10.4', 'Adoptar hábitos respetuosos: 3R y economía circular'],
      ['10.5', 'Explicar científicamente los factores responsables de la emergencia climática']]],
    [11, 'Soluciones a problemas ecosociales', [
      ['11.1', 'Diagnosticar problemas del entorno cercano relacionados con el medio'],
      ['11.2', 'Proponer acciones de concienciación y reivindicativas sobre problemas ambientales'],
      ['11.3', 'Asociar problemas sociales (crecimiento de la población…) a la alteración de los ecosistemas']]]] },
  eso3: { nombre: 'Biología y Geología · 3.º ESO', corto: '3.º ESO', ce: [
    [1, 'Resolver problemas científicos a partir de trabajos de investigación experimental', [
      ['1.1', 'Interpretar hechos observados o datos para contrastar hipótesis y extraer conclusiones'],
      ['1.2', 'Elaborar informes que justifiquen las conclusiones de acuerdo con los resultados y los modelos o teorías'],
      ['1.3', 'Argumentar, debatir y razonar sobre el problema investigado y la validez de la experiencia'],
      ['1.4', 'Diseñar experimentos para comprobar hipótesis siguiendo las pautas del trabajo científico']]],
    [2, 'Analizar situaciones problemáticas reales con lógica científica', [
      ['2.1', 'Utilizar correctamente los términos habituales de los distintos ámbitos de la ciencia'],
      ['2.2', 'Utilizar correctamente las herramientas informáticas necesarias para su trabajo'],
      ['2.3', 'Analizar críticamente la solución propuesta a un problema complejo'],
      ['2.4', 'Elegir de forma autónoma la herramienta informática adecuada para presentar resultados'],
      ['2.5', 'Construir explicaciones que relacionan hechos y conceptos indicando sus limitaciones']]],
    [3, 'Pensamiento crítico: interpretar y comunicar mensajes científicos y distinguir bulos', [
      ['3.1', 'Validar afirmaciones según los modelos teóricos y distinguirlas de valoraciones personales'],
      ['3.2', 'Construir a partir de observaciones una argumentación que apoye o desmienta una afirmación'],
      ['3.3', 'Comunicarse con lenguaje científico en intercambios y debates, con rigor medio'],
      ['3.4', 'Desarrollar una actitud abierta y receptiva hacia la diversidad de conocimientos y puntos de vista'],
      ['3.5', 'Utilizar fuentes contrastadas para construir sus argumentaciones, con complejidad media']]],
    [4, 'Validez del modelo científico y su contexto social e histórico', [
      ['4.1', 'Argumentar el valor del trabajo de las mujeres científicas y de las distintas culturas'],
      ['4.2', 'Asociar ideas científicas descartadas con su contexto histórico'],
      ['4.3', 'Relacionar los avances tecnológicos con los avances científicos que los acompañaron'],
      ['4.4', 'Argumentar la validez de las explicaciones relacionándolas con las pruebas y los modelos de cada momento']]],
    [5, 'Hábitos de vida saludable basados en el conocimiento del cuerpo', [
      ['5.1', 'Explicar qué requisitos debe cumplir una dieta sana, equilibrada y sostenible'],
      ['5.2', 'Explicar la importancia de los hábitos saludables a partir de fundamentos biológicos'],
      ['5.3', 'Justificar las respuestas del cuerpo a lesiones, enfermedades o sustancias (homeostasis)'],
      ['5.4', 'Explicar la importancia de las medidas preventivas frente a las infecciones'],
      ['5.5', 'Explicar los fundamentos y la efectividad real de los métodos anticonceptivos']]],
    [6, 'Sexualidad e identidad: conocimiento y respeto', [
      ['6.1', 'Explicar las diferencias entre sexo, género y orientación sexual'],
      ['6.2', 'Respetar todas las posibles opciones de orientación sexual y de género']]],
    [8, 'La Tierra como sistema: impacto en las poblaciones y actuaciones', [
      ['8.1', 'Explicar el funcionamiento de la Tierra y justificar la distribución de volcanes y terremotos'],
      ['8.2', 'Explicar la construcción-destrucción del relieve y asociarla a los cambios del planeta'],
      ['8.3', 'Explicar los riesgos naturales, sus causas y la influencia de la actividad humana'],
      ['8.4', 'Interpretar los fenómenos de forma global y los cambios cuando se modifican las condiciones'],
      ['8.5', 'Interpretar los ciclos de materia y los flujos de energía en la dinámica terrestre y los seres vivos']]],
    [9, 'Historia de la Tierra y evolución', [
      ['9.1', 'Explicar el papel de la historia geológica en la evolución y las grandes extinciones'],
      ['9.2', 'Aplicar la perspectiva temporal a los cambios del planeta y de sus organismos'],
      ['9.3', 'Valorar el conocimiento de los fenómenos del pasado para entender el presente'],
      ['9.4', 'Justificar la biodiversidad como resultado de un proceso evolutivo determinado por procesos geológicos'],
      ['9.5', 'Justificar los cambios geológicos por procesos internos y externos (tectónica de placas, agentes externos)']]],
    [10, 'Hábitos responsables con el entorno', [
      ['10.1', 'Detectar las acciones humanas que alteran los subsistemas de la Tierra'],
      ['10.2', 'Proponer soluciones para paliar la alteración humana de los ecosistemas'],
      ['10.3', 'Describir las pautas de un consumo sostenible y de proximidad y las consecuencias de no aplicarlas']]],
    [11, 'Soluciones a problemas ecosociales', [
      ['11.1', 'Analizar y proponer medidas locales y globales para mejorar la sostenibilidad'],
      ['11.2', 'Documentarse en fuentes adecuadas sobre problemas ambientales para defender sus propuestas']]]] },
  eso4: { nombre: 'Biología y Geología · 4.º ESO', corto: '4.º ESO', ce: [
    [1, 'Metodología científica en trabajos prácticos', [
      ['1.1', 'Aplicar en un trabajo práctico la metodología de la ciencia, en el marco de los modelos aprendidos y haciendo predicciones elaboradas'],
      ['1.2', 'Interpretar adecuadamente los datos y extraer conclusiones, diferenciando variables dependientes e independientes'],
      ['1.3', 'Predecir el comportamiento de fenómenos si varían las condiciones y aplicar los resultados a fenómenos similares']]],
    [2, 'Resolver problemas con lógica científica', [
      ['2.1', 'Utilizar correctamente los términos técnicos de los distintos ámbitos de la ciencia'],
      ['2.2', 'Incorporar nuevas herramientas informáticas adecuadas a sus necesidades de trabajo'],
      ['2.3', 'Predecir cómo se modificaría la situación observada si cambiaran las condiciones del problema'],
      ['2.4', 'Aplicar las soluciones encontradas a un problema en otros contextos o situaciones próximas']]],
    [3, 'Pensamiento crítico y comunicación científica', [
      ['3.1', 'Argumentar frente a afirmaciones dogmáticas, distinguiendo la ciencia del pensamiento mágico o la mitología'],
      ['3.2', 'Contrastar posibles explicaciones de fenómenos, justificando la importancia de las variables del proceso'],
      ['3.3', 'Elaborar documentos o productos con distintas herramientas de presentación y varias soluciones a un problema'],
      ['3.4', 'Comunicarse con lenguaje científico en intercambios y debates e interpretar o producir mensajes científicos'],
      ['3.5', 'Desarrollar una actitud abierta y receptiva hacia la diversidad de conocimientos, puntos de vista y enfoques']]],
    [4, 'Validez de los modelos científicos en su contexto histórico', [
      ['4.1', 'Justificar la validez de los modelos científicos en su contexto histórico (origen de la vida, teoría celular, herencia, evolución, tectónica)'],
      ['4.2', 'Distinguir la controversia científica de la discusión ideológica y su importancia en el avance de la ciencia'],
      ['4.3', 'Relacionar los avances en tecnología con los progresos en el conocimiento de la naturaleza'],
      ['4.4', 'Relacionar los avances en genética, evolución y dinámica terrestre con mejoras en la salud y la calidad de vida']]],
    [5, 'Sexualidad y hábitos saludables', [
      ['5.1', 'Justificar decisiones sobre sexualidad y hábitos saludables a partir del funcionamiento del propio cuerpo'],
      ['5.2', 'Contrastar informaciones y puntos de vista sobre sexualidad y reproducción humanas con conocimientos científicos'],
      ['5.3', 'Relacionarse con el resto de personas de manera libre y saludable, respetando todas las opciones y deseos']]],
    [6, 'Conservación de la vida, ciclos biológicos y clasificación', [
      ['6.1', 'Argumentar la necesidad de conservar todas las formas de vida a partir del conocimiento de los sistemas biológicos y geológicos'],
      ['6.2', 'Explicar los distintos tipos de ciclos biológicos con ejemplos'],
      ['6.3', 'Manejar claves dicotómicas distinguiendo los criterios que muestran parentesco evolutivo de los que no']]],
    [7, 'Tectónica de placas, riesgos y recursos', [
      ['7.1', 'Explicar los principales fenómenos geológicos a la luz de la tectónica de placas'],
      ['7.2', 'Analizar las interacciones entre la humanidad y el planeta: riesgos naturales, recursos y su uso sostenible'],
      ['7.3', 'Predecir la evolución del sistema con razonamiento lógico, argumentación y lenguaje simbólico de la ciencia']]],
    [8, 'Evolución de la vida y de la Tierra', [
      ['8.1', 'Explicar la biodiversidad actual como resultado de un proceso natural desde un origen común'],
      ['8.2', 'Explicar el papel de la Geología en el conocimiento de la evolución por selección natural'],
      ['8.3', 'Interpretar el presente del planeta y de la vida a partir de los cambios profundos del pasado'],
      ['8.4', 'Explicar la evolución humana y su relación con los cambios geológicos y ecológicos']]],
    [9, 'Alteraciones ambientales y consecuencias sociales', [
      ['9.1', 'Explicar las causas de las alteraciones del medio ambiente y su relación con la actividad humana'],
      ['9.2', 'Explicar las consecuencias para las poblaciones menos favorecidas del cambio climático, el agotamiento de recursos, los residuos o la contaminación'],
      ['9.3', 'Relacionar la explotación de recursos de zonas empobrecidas con la migración, las hambrunas o la inestabilidad'],
      ['9.4', 'Proponer soluciones para paliar las distintas formas de alteración humana de los ecosistemas']]],
    [10, 'Agenda 2030 y propuestas ecosociales', [
      ['10.1', 'Explicar los Objetivos de Desarrollo Sostenible de la Agenda 2030 y algunas de sus metas'],
      ['10.2', 'Proponer acciones a las administraciones para alcanzar las metas de la Agenda 2030'],
      ['10.3', 'Proponer medidas de prevención y adaptación al cambio climático y a los problemas ecosociales']]]] },
  bach1: { nombre: 'Biología, Geología y CC. Ambientales · 1.º Bach', corto: '1.º Bach BGCA', ce: [
    [1, 'Interpretar y transmitir información científica', [
      ['1.1', 'Analizar críticamente conceptos y procesos interpretando información en diferentes formatos'],
      ['1.2', 'Comunicar informaciones u opiniones razonadas de forma clara y rigurosa, con terminología y formatos adecuados'],
      ['1.3', 'Argumentar defendiendo una postura razonada con actitud abierta y respetuosa']]],
    [2, 'Localizar y evaluar fuentes fiables', [
      ['2.1', 'Plantear y resolver cuestiones localizando y citando fuentes y analizando críticamente la información'],
      ['2.2', 'Contrastar y justificar la veracidad de la información frente a pseudociencias, teorías conspiratorias y bulos'],
      ['2.3', 'Argumentar la contribución de la ciencia a la sociedad, destacando el papel de la mujer']]],
    [3, 'Proyectos de investigación', [
      ['3.1', 'Plantear preguntas, realizar predicciones y formular hipótesis contrastables'],
      ['3.2', 'Diseñar la experimentación y la toma de datos minimizando los sesgos'],
      ['3.3', 'Realizar experimentos y tomar datos con los instrumentos y técnicas adecuados'],
      ['3.4', 'Interpretar y analizar resultados con herramientas matemáticas y obtener conclusiones razonadas'],
      ['3.5', 'Establecer colaboraciones en las distintas fases del proyecto valorando la cooperación']]],
    [4, 'Resolver problemas', [
      ['4.1', 'Resolver problemas o explicar procesos biológicos, geológicos o ambientales con recursos variados'],
      ['4.2', 'Analizar críticamente la solución a un problema y modificar procedimientos o conclusiones si no es viable']]],
    [5, 'Iniciativas de sostenibilidad y salud', [
      ['5.1', 'Analizar causas y consecuencias de los principales problemas medioambientales desde una perspectiva local y global'],
      ['5.2', 'Proponer y poner en práctica hábitos e iniciativas sostenibles y saludables a nivel local']]],
    [6, 'Registro geológico e historia de la Tierra', [
      ['6.1', 'Relacionar los grandes eventos de la historia terrestre con elementos del registro geológico'],
      ['6.2', 'Resolver problemas de datación analizando el registro geológico y fósil']]]] },
  bhs1: { nombre: 'Biología Humana y Salud · 1.º Bach', corto: 'Biología Humana', ce: [
    [1, 'Investigaciones en biología humana', [
      ['1.1', 'Identificar y formular problemas científicos de biología humana que requieran preguntas investigables'],
      ['1.2', 'Formular hipótesis y diseñar procesos y estrategias de contrastación'],
      ['1.3', 'Buscar, valorar y seleccionar fuentes de información fiables con actitud crítica'],
      ['1.4', 'Procesar los datos obtenidos e interpretar los resultados'],
      ['1.5', 'Formular argumentaciones y conclusiones fundamentadas en los resultados y en investigaciones anteriores']]],
    [2, 'Métodos experimentales y seguridad', [
      ['2.1', 'Vincular el conocimiento científico disponible para proceder durante la experiencia e interpretar los resultados'],
      ['2.2', 'Planificar las acciones y delimitar el alcance de la actividad experimental'],
      ['2.3', 'Utilizar correctamente los instrumentos y técnicas básicas de anatomía, fisiología y componentes moleculares'],
      ['2.4', 'Obtener y registrar datos de forma sistemática y elaborar conclusiones considerando los errores'],
      ['2.5', 'Utilizar el cuaderno de laboratorio para registrar observaciones y conclusiones'],
      ['2.6', 'Trabajar en el laboratorio respetando las normas de seguridad']]],
    [3, 'Comunicar conclusiones', [
      ['3.1', 'Elaborar memorias e informes con el vocabulario y la notación propios de la materia'],
      ['3.2', 'Comunicar conclusiones de investigaciones o actividades experimentales de forma clara y rigurosa'],
      ['3.3', 'Utilizar la terminología y el formato adecuados respondiendo de manera fundamentada a las cuestiones']]],
    [4, 'Decisiones sobre el cuerpo y la salud', [
      ['4.1', 'Describir la estructura y organización del cuerpo humano: células, tejidos, órganos y aparatos'],
      ['4.2', 'Analizar la fisiología de aparatos y sistemas y relacionarla con las alteraciones y enfermedades más comunes'],
      ['4.3', 'Explicar las respuestas del cuerpo a lesiones, enfermedades o sustancias mediante la homeostasis'],
      ['4.4', 'Relacionar los modos de actuación de la medicina frente a las enfermedades con la fisiología'],
      ['4.5', 'Identificar y describir técnicas básicas de diagnóstico y sus aplicaciones tecnológicas']]],
    [5, 'Salud, estilos de vida, medio ambiente y sistemas sanitarios', [
      ['5.1', 'Argumentar con fundamentos científicos la necesidad de hábitos de vida saludables'],
      ['5.2', 'Explicar la relación entre la salud humana y las condiciones ambientales'],
      ['5.3', 'Analizar acciones humanas que modifican el medio ambiente con consecuencias para la salud'],
      ['5.4', 'Relacionar las condiciones de vida, sociales y económicas y los sistemas sanitarios con la salud']]]] },
  bio2: { nombre: 'Biología · 2.º Bach', corto: 'Biología 2.º Bach', ce: [
    [1, 'Interpretar y transmitir información científica', [
      ['1.1', 'Analizar críticamente conceptos y procesos biológicos interpretando información en diferentes formatos'],
      ['1.2', 'Comunicar informaciones u opiniones razonadas de forma clara y rigurosa, con terminología y formatos adecuados'],
      ['1.3', 'Argumentar considerando los puntos fuertes y débiles de diferentes posturas, con actitud respetuosa']]],
    [2, 'Fuentes fiables', [
      ['2.1', 'Plantear y resolver cuestiones y crear contenidos citando fuentes y analizando críticamente la información'],
      ['2.2', 'Contrastar y justificar la veracidad de la información frente a pseudociencias, teorías conspiratorias y bulos']]],
    [3, 'Analizar trabajos de investigación', [
      ['3.1', 'Evaluar la fiabilidad de las conclusiones de un trabajo de investigación o divulgación'],
      ['3.2', 'Argumentar con ejemplos la contribución de la ciencia a la sociedad, destacando el papel de la mujer']]],
    [4, 'Plantear y resolver problemas', [
      ['4.1', 'Explicar fenómenos biológicos mediante el planteamiento y la resolución de problemas'],
      ['4.2', 'Analizar críticamente la solución a un problema y reformularla si no es viable']]],
    [5, 'Estilos de vida saludables y sostenibles', [
      ['5.1', 'Argumentar la importancia de estilos de vida saludables y sostenibles basándose en la biología molecular']]],
    [6, 'Biomoléculas y procesos vitales', [
      ['6.1', 'Explicar las características y procesos vitales a partir de las biomoléculas, sus interacciones y el metabolismo'],
      ['6.2', 'Aplicar metodologías analíticas en el laboratorio con precisión']]]] },
  bach2: { nombre: 'Geología y Ciencias Ambientales · 2.º Bach', corto: '2.º Bach', ce: [
    [1, 'Interpretar y transmitir información y datos de trabajos científicos', [
      ['1.1', 'Analizar críticamente conceptos y procesos interpretando mapas, cortes, modelos y diagramas'],
      ['1.2', 'Comunicar informaciones u opiniones razonadas con vocabulario y formatos adecuados'],
      ['1.3', 'Realizar discusiones científicas razonadas, con actitud receptiva y respetuosa']]],
    [2, 'Localizar y utilizar fuentes fiables y contrastar la información', [
      ['2.1', 'Plantear y resolver cuestiones y crear contenidos citando fuentes y analizando la información'],
      ['2.2', 'Contrastar y justificar la veracidad de la información frente a pseudociencias y bulos']]],
    [3, 'Analizar críticamente trabajos de investigación o divulgación', [
      ['3.1', 'Evaluar la fiabilidad de las conclusiones de un trabajo de investigación o divulgación'],
      ['3.2', 'Argumentar la contribución de la ciencia a la sociedad, destacando el papel de la mujer']]],
    [4, 'Plantear y resolver problemas', [
      ['4.1', 'Explicar fenómenos mediante el planteamiento y la resolución de problemas'],
      ['4.2', 'Analizar críticamente la solución a un problema y reformularla si no es viable']]],
    [5, 'Impactos ambientales, recursos y sostenibilidad', [
      ['5.1', 'Promover hábitos sostenibles a partir del análisis de los recursos geológicos y de la biosfera'],
      ['5.2', 'Relacionar la explotación de recursos con el deterioro ambiental y su consumo responsable']]],
    [6, 'Elementos geológicos del relieve, historia geológica y riesgos', [
      ['6.1', 'Deducir y explicar la historia geológica de un área a partir de fotografías, cortes y mapas'],
      ['6.2', 'Predecir fenómenos geológicos y riesgos naturales en un área y proponer medidas de prevención']]]] }
};

