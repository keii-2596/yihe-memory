import type { CareerLevel, Question } from '../lib/model.ts';

type Topic = {
  roleId: string;
  prefix: string;
  category: string;
  name: string;
  level: CareerLevel;
  tags: string[];
  definition: string;
  mechanism: string;
  boundary: string;
  failure: string;
  practice: string;
};

const cardKinds = [
  { title:(name:string)=>`${name}是什么，主要解决什么问题？`, hint:'先说清定义与目标，再补充核心机制和实际价值。', fields:['definition','mechanism','boundary'] as const },
  { title:(name:string)=>`${name}的核心工作机制是什么？`, hint:'按关键组件、执行流程和结果保证来回答。', fields:['mechanism','definition','practice'] as const },
  { title:(name:string)=>`${name}适合哪些场景，有什么边界？`, hint:'同时说明适用条件、收益、成本和不适用场景。', fields:['boundary','definition','failure'] as const },
  { title:(name:string)=>`${name}常见故障或误用有哪些，如何排查？`, hint:'从现象、证据、根因和止损顺序组织回答。', fields:['failure','mechanism','practice'] as const },
  { title:(name:string)=>`在真实项目中如何正确落地${name}？`, hint:'给出设计步骤、验证指标、异常处理和回滚方案。', fields:['practice','boundary','failure'] as const },
];

function expand(topics:Topic[]):Question[]{
  return topics.flatMap((topic,topicIndex)=>cardKinds.map((kind,cardIndex)=>{
    const keyPoints=kind.fields.map(field=>topic[field]);
    return {
      id:`kb-${topic.prefix}-${String(topicIndex+1).padStart(2,'0')}-${cardIndex+1}`,
      category:topic.category,
      title:kind.title(topic.name),
      hint:kind.hint,
      keyPoints,
      reference:`${keyPoints.join('；')}。`,
      difficulty:topic.level==='junior'?1:topic.level==='mid'?2:3,
      strength:20,
      tags:[topic.category,...topic.tags,topic.level==='junior'?'初级':topic.level==='mid'?'中级':'高级'],
      routeIds:[topic.roleId],
      roleIds:[topic.roleId],
      levels:[topic.level],
      directionTags:topic.tags,
      prerequisites:[],
      bankVersion:2,
      source:'权威文档校准题库 v2',
    };
  }));
}

const java:Topic[]=[
  {roleId:'java-backend',prefix:'java',category:'Java 基础',name:'Java Record',level:'mid',tags:['Java 语言'],definition:'Record 用紧凑语法表达以数据为中心的浅不可变载体',mechanism:'编译器生成组件字段、访问器、构造器以及 equals、hashCode 和 toString',boundary:'适合 DTO 与值对象，但组件引用本身仍可能指向可变对象',failure:'误以为 Record 深度不可变，或把带复杂生命周期的实体建模为 Record',practice:'校验规范构造器输入，防御性复制可变组件，并保持领域语义清晰'},
  {roleId:'java-backend',prefix:'java',category:'Java 新特性',name:'密封类与模式匹配',level:'mid',tags:['Java 语言'],definition:'密封类限制可直接继承的类型集合，模式匹配让分支按类型安全地解构',mechanism:'permits 与 final、sealed、non-sealed 形成封闭层次，编译器可检查分支穷尽性',boundary:'适合稳定的代数数据类型，不适合需要第三方任意扩展的插件接口',failure:'层次边界设计过大导致每次扩展都修改核心模块，或遗漏 null 分支',practice:'把封闭层次放在同一领域边界，用穷尽 switch 表达状态机并配套测试'},
  {roleId:'java-backend',prefix:'java',category:'Java IO',name:'零拷贝与 FileChannel',level:'senior',tags:['性能','NIO'],definition:'零拷贝减少数据在内核态与用户态之间的无效复制和上下文切换',mechanism:'transferTo 等能力可让内核直接在文件页缓存与套接字缓冲区间搬运数据',boundary:'适合大文件传输，涉及加密、压缩或业务变换时仍需用户态处理',failure:'只看方法名就宣称完全没有复制，忽略操作系统实现与短写结果',practice:'循环处理部分传输，记录吞吐与 CPU，并用基准测试验证目标平台收益'},
  {roleId:'java-backend',prefix:'java',category:'Java 并发',name:'结构化并发',level:'senior',tags:['并发','虚拟线程'],definition:'结构化并发把一组并发子任务约束在明确的词法生命周期内',mechanism:'父作用域统一派生、等待、取消并汇总子任务结果和异常',boundary:'适合请求内并行调用，不适合脱离请求长期运行的后台任务',failure:'子任务泄漏、异常被吞或超时后仍继续占用下游资源',practice:'设置整体截止时间，失败即取消兄弟任务，并集中处理结果与可观测信息'},
  {roleId:'java-backend',prefix:'java',category:'JVM',name:'JIT 分层编译与去优化',level:'senior',tags:['JVM','性能'],definition:'JIT 根据运行热点把字节码逐步编译为更高质量的机器码',mechanism:'解释执行收集画像，分层编译应用内联等优化，假设失效时触发去优化',boundary:'适合长期运行热点代码，短任务可能在充分预热前结束',failure:'基准测试未预热、混入类加载与 GC，或把偶发去优化误判为业务抖动',practice:'使用 JMH 控制预热和黑洞消费，结合 JFR 与编译日志验证热点变化'},
  {roleId:'java-backend',prefix:'java',category:'JVM',name:'Java Flight Recorder',level:'mid',tags:['JVM','排障'],definition:'JFR 以较低开销持续记录 JVM、线程、分配、锁和应用事件',mechanism:'事件写入内存缓冲并周期落盘，可按模板控制阈值、采样和保留窗口',boundary:'适合生产持续诊断，但极细粒度事件和长时间保留仍有成本',failure:'只采集不建立事件时间线，或忽略时钟、容器资源与业务发布背景',practice:'预置常驻录制与滚动文件，故障时保全现场并用 JMC 关联 CPU、GC 和锁'},
  {roleId:'java-backend',prefix:'java',category:'Spring',name:'Spring 三级缓存与循环依赖',level:'senior',tags:['Spring','依赖注入'],definition:'三级缓存是 Spring 单例创建过程中提前暴露引用的一套内部协作机制',mechanism:'成品单例、早期引用和对象工厂配合，在属性注入阶段打破部分依赖环',boundary:'只能处理部分单例字段注入环，构造器循环和原型循环不能可靠解决',failure:'依赖环掩盖职责耦合，代理对象暴露时机不当还可能产生原始对象引用',practice:'优先重构依赖方向或引入中介，确需保留时用测试确认代理与初始化语义'},
  {roleId:'java-backend',prefix:'java',category:'Spring',name:'Spring 事务传播与挂起',level:'senior',tags:['Spring','事务'],definition:'事务传播规则决定方法加入、创建、挂起事务或以非事务方式执行',mechanism:'代理拦截调用并依据传播级别绑定或切换线程上下文中的事务资源',boundary:'REQUIRES_NEW 可隔离提交但会额外占用连接，NESTED 依赖保存点支持',failure:'自调用绕过代理、异常被捕获未回滚，或连接池不足导致内外事务互等',practice:'从业务原子性选择传播级别，明确回滚规则，并压测连接池和异常路径'},
  {roleId:'java-backend',prefix:'java',category:'Spring Boot',name:'Spring Boot 自动配置条件',level:'mid',tags:['Spring Boot'],definition:'自动配置根据类路径、配置项和现有 Bean 条件提供合理默认装配',mechanism:'自动配置类由导入机制加载，Conditional 系列注解决定候选配置是否生效',boundary:'适合约定优于配置，但复杂系统仍需明确覆盖顺序与条件报告',failure:'同名 Bean 覆盖、条件未命中或依赖版本漂移造成环境间行为不同',practice:'使用条件评估报告定位装配，显式声明关键 Bean 并锁定依赖版本'},
  {roleId:'java-backend',prefix:'java',category:'MyBatis',name:'MyBatis 插件拦截链',level:'mid',tags:['MyBatis','ORM'],definition:'MyBatis 插件通过代理拦截执行器、语句处理器等扩展点改变行为',mechanism:'Interceptor 按配置顺序包装目标对象并对匹配签名执行 intercept',boundary:'适合审计、分页等横切能力，不适合偷偷改写复杂业务语义',failure:'插件顺序冲突、SQL 重写破坏参数绑定，或递归调用导致重复拦截',practice:'限制拦截范围，保留原始语义，覆盖多插件组合并记录改写后的 SQL'},
  {roleId:'java-backend',prefix:'java',category:'数据库',name:'InnoDB Change Buffer',level:'senior',tags:['MySQL','存储引擎'],definition:'Change Buffer 延迟合并非唯一二级索引页的修改以减少随机磁盘读写',mechanism:'目标索引页不在缓冲池时先记录变更，页面后续读入或后台阶段再合并',boundary:'适合写多且二级索引页分散的负载，唯一索引需立即检查不能缓冲',failure:'索引过多导致合并压力和恢复时间增加，或把缓冲命中当成持久化完成',practice:'结合缓冲池命中、I/O 与合并指标评估，优先减少低价值二级索引'},
  {roleId:'java-backend',prefix:'java',category:'数据库',name:'MySQL Online DDL',level:'senior',tags:['MySQL','变更'],definition:'Online DDL 在执行表结构变更时尽量允许并发读写以降低业务阻塞',mechanism:'不同算法选择元数据修改、原地构建或复制表，并通过锁级别约束并发',boundary:'是否真正在线取决于具体操作、版本、算法和表特征',failure:'元数据锁等待、临时空间不足、复制延迟或长事务让变更长时间卡住',practice:'在影子环境验证算法与耗时，清理长事务，设锁等待上限并准备回退'},
  {roleId:'java-backend',prefix:'java',category:'Redis',name:'Redis Streams 消费组',level:'mid',tags:['Redis','消息'],definition:'Redis Streams 是带持久条目 ID、消费组和待确认列表的日志数据结构',mechanism:'消费组分配新消息，消费者确认后从 PEL 移除，超时消息可被其他消费者认领',boundary:'适合轻量事件流，不替代具备完整跨机房治理的大型消息平台',failure:'遗漏确认导致 PEL 堆积，消费者崩溃后消息无人认领，或流无限增长',practice:'监控 pending 与 lag，设置修剪策略，设计幂等消费和故障认领流程'},
  {roleId:'java-backend',prefix:'java',category:'消息队列',name:'Kafka 消费者再均衡',level:'senior',tags:['Kafka','消息'],definition:'再均衡是在组成员或订阅变化时重新分配分区所有权的协调过程',mechanism:'协调器管理组代次与分配协议，消费者撤销旧分区后接管新分区',boundary:'适合动态扩缩容，但频繁再均衡会暂停消费并放大尾延迟',failure:'处理时间超过轮询约束、实例抖动或一次撤销全部分区造成重复与积压',practice:'控制批次与处理时长，采用协作式分配，提交可恢复进度并监控组状态'},
  {roleId:'java-backend',prefix:'java',category:'消息队列',name:'Kafka Exactly-once 语义',level:'senior',tags:['Kafka','一致性'],definition:'Kafka 的恰好一次语义在限定边界内避免同一事务结果被重复可见',mechanism:'幂等生产者用序列号去重，事务协调器原子提交输出记录与消费位点',boundary:'只覆盖 Kafka 事务链路，外部数据库或 HTTP 副作用仍需额外一致性设计',failure:'误把消费者只处理一次当成事实，或跨系统双写后无法原子回滚',practice:'明确一致性边界，配置 read_committed，并为外部副作用增加幂等或 Outbox'},
  {roleId:'java-backend',prefix:'java',category:'分布式',name:'一致性哈希与虚拟节点',level:'mid',tags:['分片','负载均衡'],definition:'一致性哈希让节点变化时只迁移环上相邻的一部分键',mechanism:'键和节点映射到同一哈希环，虚拟节点把单个物理节点分散到多个位置',boundary:'适合缓存与分片路由，但不能自动解决容量差异和热点键',failure:'虚拟节点太少造成倾斜，节点故障使相邻节点过载，或副本策略不一致',practice:'按容量分配虚拟节点，配合副本、限流和迁移监控，并验证键分布'},
  {roleId:'java-backend',prefix:'java',category:'分布式',name:'租约与分布式锁续期',level:'senior',tags:['分布式锁','一致性'],definition:'租约是带失效时间的所有权声明，避免持有者失联后资源永久锁死',mechanism:'存储端原子创建带期限的令牌，持有者周期续期并用唯一令牌安全释放',boundary:'适合互斥协调但不能抵御执行暂停后旧持有者继续写入的全部风险',failure:'续期线程停顿、时钟与网络异常造成租约过期后双持有者并存',practice:'关键写入使用 fencing token 拒绝旧持有者，并让任务本身幂等可重试'},
  {roleId:'java-backend',prefix:'java',category:'系统设计',name:'多级缓存一致性',level:'senior',tags:['缓存','系统设计'],definition:'多级缓存用进程、本地和远端多层命中降低延迟与后端压力',mechanism:'请求逐级查找，写入通过失效通知、版本号或较短 TTL 传播变化',boundary:'适合读多写少且允许短暂陈旧的数据，不适合强一致关键余额',failure:'失效消息丢失、层间 TTL 不协调或热点回源导致长时间脏读和雪崩',practice:'定义可接受陈旧窗口，用版本校验与兜底过期，并演练通知丢失场景'},
  {roleId:'java-backend',prefix:'java',category:'系统设计',name:'容量规划与排队论直觉',level:'senior',tags:['容量','性能'],definition:'容量规划把流量、服务时间、并发和资源上限转成可验证的容量预算',mechanism:'Little 定律用平均在途量等于吞吐乘平均时延连接关键指标',boundary:'平均值适合基线估算，突发流量与长尾分布必须用压测和分位数补充',failure:'只按平均 QPS 配机器、忽略下游配额和队列增长，最终延迟先于吞吐崩溃',practice:'从 SLO 反推单实例预算，保留故障冗余，压测拐点并设置扩容提前量'},
  {roleId:'java-backend',prefix:'java',category:'系统设计',name:'分布式限流',level:'senior',tags:['稳定性','网关'],definition:'分布式限流在多实例间统一约束请求速率或并发以保护共享容量',mechanism:'集中计数、令牌桶或分片配额通过时间窗口和原子更新决定是否放行',boundary:'强一致全局限流准确但延迟高，本地配额吞吐高但可能短时超发',failure:'固定窗口边界突刺、限流存储故障放大影响，或重试把拒绝流量再次压回系统',practice:'按用户与资源分层限流，返回退避信息，设置故障策略并监控拒绝原因'},
];

const frontend:Topic[]=[
  {roleId:'frontend',prefix:'fe',category:'JavaScript',name:'原型链与属性查找',level:'junior',tags:['JavaScript'],definition:'原型链让对象在自身缺少属性时沿内部原型关系继续查找',mechanism:'属性读取逐级检查对象与原型直到 null，new 会把实例原型连接到构造函数 prototype',boundary:'适合共享方法与委托，不应依赖深层可变原型制造隐式状态',failure:'误改共享原型污染全部实例，或把构造函数 prototype 与对象原型混为一谈',practice:'优先使用 class 或组合表达意图，用 hasOwn 区分自有属性并避免修改内建原型'},
  {roleId:'frontend',prefix:'fe',category:'JavaScript',name:'Promise 错误传播',level:'mid',tags:['异步'],definition:'Promise 链把返回值和异常统一转换为后续 fulfilled 或 rejected 状态',mechanism:'回调抛错会拒绝下一个 Promise，返回 Promise 时后续状态跟随其最终结果',boundary:'适合单次异步结果编排，持续事件流更适合事件或流式抽象',failure:'忘记 return 导致链提前完成，catch 吞错，或并行任务错误处理不完整',practice:'在边界集中捕获并保留 cause，按语义选择 all、allSettled、race 或 any'},
  {roleId:'frontend',prefix:'fe',category:'TypeScript',name:'TypeScript 条件类型与 infer',level:'senior',tags:['TypeScript'],definition:'条件类型按可赋值关系选择结果，infer 可在匹配结构中声明待推断类型变量',mechanism:'泛型参数为裸类型时可能对联合类型分发，再合并每个成员的结果',boundary:'适合封装可复用类型变换，过度嵌套会拖慢编译并降低可读性',failure:'意外分发、递归深度过大或用类型技巧掩盖不稳定的运行时数据',practice:'为复杂工具类型写命名中间层和类型测试，在外部输入处仍做运行时校验'},
  {roleId:'frontend',prefix:'fe',category:'浏览器',name:'浏览器渲染流水线',level:'mid',tags:['渲染'],definition:'渲染流水线把 DOM 与样式转换为布局、绘制记录和最终合成图层',mechanism:'样式计算与布局确定几何，绘制生成指令，合成线程组合可独立图层',boundary:'transform 和 opacity 常可只合成，但图层过多也会增加显存与管理成本',failure:'读写布局交错触发强制同步布局，或大面积重绘造成帧率下降',practice:'批量 DOM 读写，用性能面板定位长帧，并围绕用户交互验证优化'},
  {roleId:'frontend',prefix:'fe',category:'浏览器',name:'HTTP 缓存验证链路',level:'mid',tags:['HTTP','缓存'],definition:'HTTP 缓存通过新鲜度和条件请求决定直接复用响应还是向服务器验证',mechanism:'Cache-Control 控制新鲜度，ETag 或 Last-Modified 在过期后参与条件请求',boundary:'强缓存适合指纹静态资源，个性化响应需正确设置 private 与 Vary',failure:'HTML 长缓存导致版本入口陈旧，Vary 缺失造成内容串用，或 CDN 与浏览器策略冲突',practice:'静态资源内容哈希并长期缓存，HTML 短缓存，使用网络面板验证各层命中'},
  {roleId:'frontend',prefix:'fe',category:'React',name:'React 闭包与状态快照',level:'mid',tags:['React'],definition:'每次 React 渲染都创建一份固定 props 与 state 的事件处理器快照',mechanism:'回调闭包读取创建它的那次渲染值，状态更新只会安排新的渲染',boundary:'快照保证单次渲染一致性，但异步回调可能读取已经过期的状态',failure:'定时器和订阅捕获旧值，或连续更新基于同一个旧状态发生覆盖',practice:'依赖前值时使用函数式更新，长期回调用 ref 或重新订阅保持最新语义'},
  {roleId:'frontend',prefix:'fe',category:'React',name:'React Server Components',level:'senior',tags:['React','架构'],definition:'Server Components 在服务端执行并把可序列化组件结果流式传给客户端',mechanism:'构建系统按 server/client 边界拆分模块，客户端只下载交互组件所需代码',boundary:'适合数据读取与减少客户端包，不直接拥有浏览器状态或事件处理器',failure:'边界放置不当导致客户端包膨胀，序列化失败或数据请求瀑布',practice:'让交互边界尽量小，在服务端并行取数并审计生成包与缓存语义'},
  {roleId:'frontend',prefix:'fe',category:'前端工程化',name:'代码分割与动态导入',level:'mid',tags:['构建','性能'],definition:'代码分割把应用拆成按路由或功能加载的独立资源块以降低首屏成本',mechanism:'构建器以动态 import 为异步边界生成 chunk，运行时按需请求并执行',boundary:'适合低频大模块，过细切分会增加请求、解析和缓存碎片成本',failure:'公共依赖重复、加载瀑布或更新后旧 HTML 引用已删除 chunk',practice:'按用户路径分块，预加载下一步资源，保留旧资源窗口并监控 chunk 错误'},
  {roleId:'frontend',prefix:'fe',category:'前端工程化',name:'Monorepo 依赖边界',level:'senior',tags:['工程化','架构'],definition:'Monorepo 在一个版本库管理多个应用与包以统一协作和原子变更',mechanism:'工作区解析本地依赖，任务图依据包依赖执行缓存、构建和测试',boundary:'适合共享规范与频繁跨包修改，超大仓库需要权限和增量工具治理',failure:'包之间任意引用形成隐式耦合，缓存键不完整导致错误复用产物',practice:'定义单向分层和公开入口，用依赖检查与受影响测试守住边界'},
  {roleId:'frontend',prefix:'fe',category:'前端性能',name:'长任务与 INP 优化',level:'senior',tags:['性能','交互'],definition:'长任务持续占用主线程会推迟输入处理和下一次渲染，从而恶化 INP',mechanism:'事件必须等待当前任务结束，处理器、样式布局和绘制共同构成交互延迟',boundary:'拆任务能改善响应但增加状态管理，Web Worker 也不能直接操作 DOM',failure:'只优化处理器本身却忽略输入延迟和呈现延迟，或用节流掩盖重计算',practice:'用用户时序和性能面板拆解 INP，将可中断工作分片并移出主线程'},
  {roleId:'frontend',prefix:'fe',category:'Web 安全',name:'内容安全策略 CSP',level:'senior',tags:['安全'],definition:'CSP 用响应策略限制页面可加载和执行的脚本、样式及其他资源来源',mechanism:'浏览器按指令、nonce 或 hash 校验资源，违规可阻止并上报',boundary:'CSP 是纵深防御而非输出编码替代品，第三方脚本会增加策略复杂度',failure:'保留 unsafe-inline 让策略形同虚设，或策略过严导致生产功能静默失效',practice:'先用 Report-Only 收集违规，逐步采用 nonce 并清理内联脚本和宽泛域名'},
  {roleId:'frontend',prefix:'fe',category:'Web 安全',name:'跨源隔离与 CORS',level:'mid',tags:['安全','浏览器'],definition:'同源策略限制跨源读取，CORS 由服务器声明浏览器可以向哪些来源开放响应',mechanism:'复杂请求先预检，浏览器检查允许来源、方法、头与凭证后决定暴露响应',boundary:'CORS 不是身份认证，也不会阻止服务器或非浏览器客户端发请求',failure:'反射任意 Origin 并允许凭证，缓存缺少 Vary，或把预检失败误判为后端未收到',practice:'维护精确来源白名单，最小化方法和头，并让认证、CSRF 与 CORS 各司其职'},
  {roleId:'frontend',prefix:'fe',category:'前端架构',name:'前端状态归属',level:'senior',tags:['状态管理','架构'],definition:'状态归属是决定数据应放在组件、URL、服务端缓存还是全局客户端仓库',mechanism:'状态位置决定更新传播、生命周期、共享范围和可恢复方式',boundary:'局部交互不应全局化，服务端数据也不应被当作永久客户端真相',failure:'重复保存派生状态造成不一致，或全局仓库承载所有瞬时 UI 状态',practice:'按最小共享范围放置状态，让 URL 表达可分享视图并用查询缓存管理服务端数据'},
  {roleId:'frontend',prefix:'fe',category:'前端测试',name:'前端测试金字塔',level:'mid',tags:['测试','质量'],definition:'前端测试金字塔用大量快速单元与组件测试支撑少量关键端到端测试',mechanism:'不同层分别验证纯逻辑、用户可见组件契约、接口集成和核心旅程',boundary:'比例应随风险调整，不能用单元测试替代真实浏览器兼容与关键流程验证',failure:'端到端数量失控导致慢且易抖，或过度 mock 让测试与真实行为脱节',practice:'按用户行为断言，稳定控制数据和时间，只把最高价值旅程放进 E2E'},
];

const golang:Topic[]=[
  {roleId:'go-backend',prefix:'go',category:'Go 基础',name:'Go 零值设计',level:'junior',tags:['Go 语言'],definition:'零值设计让声明后未显式初始化的值也处于可直接使用的有效状态',mechanism:'编译器和运行时把新分配存储清零，各类型拥有确定的零值语义',boundary:'适合锁、缓冲区等可自然默认的类型，外部资源仍需显式构造和校验',failure:'把 nil map 当成可写、复制已使用的锁，或用零值掩盖必填配置缺失',practice:'让自定义类型尽量零值可用，对无合理默认值的参数提供构造器并尽早失败'},
  {roleId:'go-backend',prefix:'go',category:'Go 基础',name:'Go 方法集与接口满足',level:'mid',tags:['Go 语言','接口'],definition:'方法集决定值类型或指针类型能够调用哪些方法以及是否满足某接口',mechanism:'值接收者方法属于 T 与 *T，指针接收者方法通常只属于 *T 的方法集',boundary:'适合用接口做小型能力抽象，但不应为复用而创建臃肿接口',failure:'把 T 放入接口后无法调用指针方法，或复制含状态对象导致修改不生效',practice:'在使用方定义最小接口，按是否修改状态和复制成本选择接收者'},
  {roleId:'go-backend',prefix:'go',category:'Go 基础',name:'Go defer 执行语义',level:'junior',tags:['Go 语言'],definition:'defer 把函数调用登记到当前函数返回前按后进先出执行',mechanism:'实参在登记时求值，返回阶段依次执行，并可观察或修改命名返回值',boundary:'适合资源释放和恢复边界，热循环中大量 defer 仍需评估生命周期与成本',failure:'在循环内延迟关闭导致资源积压，或误以为闭包变量在登记时已复制',practice:'获取资源后立即登记清理，把循环体抽成函数并让 panic 恢复只发生在边界'},
  {roleId:'go-backend',prefix:'go',category:'Go 并发',name:'select 公平性与取消',level:'mid',tags:['并发','channel'],definition:'select 同时等待多个通道操作，用于复用事件、超时和取消信号',mechanism:'多个 case 就绪时运行时伪随机选择一个，default 会让等待变为非阻塞',boundary:'适合协调并发事件，但不提供业务级严格优先级或全局公平保证',failure:'default 忙轮询耗尽 CPU，nil channel 永久阻塞，或取消信号未贯穿子任务',practice:'把 context.Done 纳入每个阻塞点，关闭所有退出路径并用测试覆盖竞争顺序'},
  {roleId:'go-backend',prefix:'go',category:'Go 并发',name:'sync.Once 与一次性初始化',level:'mid',tags:['并发','同步'],definition:'sync.Once 保证一个函数在并发调用下最多成功进入执行一次',mechanism:'快速路径读取完成标志，慢路径互斥执行函数并在返回后发布完成状态',boundary:'适合进程生命周期内不可重置初始化，不适合需要失败重试或动态刷新',failure:'初始化函数 panic 后 Once 仍视为已执行，或函数内部递归调用同一 Once 死锁',practice:'让初始化简短且可验证，需要重试时使用显式状态机而不是强行重置 Once'},
  {roleId:'go-backend',prefix:'go',category:'Go Runtime',name:'Go 逃逸分析',level:'senior',tags:['运行时','性能'],definition:'逃逸分析决定变量能否安全放在栈上，还是必须分配到堆并由 GC 管理',mechanism:'编译器沿赋值和调用关系判断引用是否可能超过当前栈帧生命周期',boundary:'堆分配不等于错误，可读性与正确性通常优先于为了逃逸结果改写代码',failure:'把返回指针一概认为必逃逸，或只看分配次数却忽略对象存活时间',practice:'用编译诊断和基准测试确认热点，优先减少接口装箱与不必要的长期引用'},
  {roleId:'go-backend',prefix:'go',category:'Go Runtime',name:'Go 栈增长',level:'senior',tags:['运行时','内存'],definition:'goroutine 使用可动态增长和收缩的小栈以低成本承载大量并发任务',mechanism:'空间不足时运行时分配更大连续栈并复制帧，同时修正栈内指针',boundary:'适合普通调用深度，极深递归仍可能持续扩栈并最终耗尽内存',failure:'持有巨大栈对象增加复制成本，或把 goroutine 数量多等同于内存一定安全',practice:'避免无界递归和大局部数组，用指标与 profile 观察栈和 goroutine 增长'},
  {roleId:'go-backend',prefix:'go',category:'Go 工程',name:'Go 错误包装与 errors.Is',level:'mid',tags:['工程化','错误处理'],definition:'错误包装在保留底层原因的同时增加当前操作和业务上下文',mechanism:'fmt.Errorf 的 %w 建立 unwrap 链，errors.Is 与 As 沿链匹配值或类型',boundary:'适合可处理的因果链，不应把敏感信息或无意义的每层函数名全部暴露',failure:'用字符串比较错误、丢失 %w，或既记录又层层返回造成重复日志',practice:'在能增加决策信息的边界包装，在统一入口记录，并用 Is 或 As 分支处理'},
  {roleId:'go-backend',prefix:'go',category:'Go 工程',name:'Go 模糊测试',level:'mid',tags:['测试','质量'],definition:'模糊测试持续生成输入寻找崩溃、越界和违反不变量的边界情况',mechanism:'从种子语料变异参数，发现失败后缩减为可复现的最小输入并保存',boundary:'适合解析器、编解码和纯函数，不替代业务场景与跨服务集成测试',failure:'断言只有不崩溃而没有领域不变量，或语料不可控导致测试耗时失去边界',practice:'提供代表性种子和明确不变量，把发现的输入纳入回归并限制 CI 预算'},
  {roleId:'go-backend',prefix:'go',category:'Go 网络',name:'Go HTTP Transport 连接复用',level:'senior',tags:['网络','性能'],definition:'http.Transport 管理连接建立、空闲连接池、代理和每主机并发等客户端行为',mechanism:'响应体正确读完并关闭后连接可回池，后续请求复用以减少握手成本',boundary:'适合长期共享客户端，短生命周期新建 Transport 会破坏池化收益',failure:'未关闭响应体泄漏连接，超时缺失造成请求悬挂，或空闲池过小反复建连',practice:'复用配置好的 Client，设置分层超时和池参数，并监控连接与下游延迟'},
  {roleId:'go-backend',prefix:'go',category:'Go 性能',name:'Go 内存 profile 与采样',level:'senior',tags:['性能','诊断'],definition:'内存 profile 用采样数据定位分配热点和当前仍存活对象的主要来源',mechanism:'allocs 反映累计分配，inuse 反映采样时仍存活的对象和字节',boundary:'适合发现数量级热点，采样、内联和 GC 时机会影响精确值',failure:'只看 inuse 就找不到高频短命分配，或抓一次快照就宣称存在泄漏',practice:'在同负载下比较多时点 profile，结合对象生命周期和代码路径验证'},
  {roleId:'go-backend',prefix:'go',category:'Go 架构',name:'Go 服务的背压',level:'senior',tags:['架构','稳定性'],definition:'背压让下游容量不足时把压力显式反馈给上游而不是无限排队',mechanism:'有界队列、并发信号量、速率限制和截止时间共同限制在途工作',boundary:'适合保护稳定吞吐，但拒绝和降级语义必须由业务明确接受',failure:'无界 goroutine 和 channel 推迟故障直到内存耗尽，重试进一步放大压力',practice:'为每层设置容量预算，尽早拒绝并返回退避信息，监控队列时间而非只看长度'},
  {roleId:'go-backend',prefix:'go',category:'Go 架构',name:'Go 配置热更新',level:'senior',tags:['架构','配置'],definition:'配置热更新在不停进程的情况下发布并切换一组新的运行参数',mechanism:'后台加载和校验完整快照，再通过原子指针或受控锁一次替换读取视图',boundary:'适合超时和开关等无状态参数，连接模型等结构变化可能需要滚动发布',failure:'逐字段更新让读者看到混合版本，错误配置立即扩散且无法快速回滚',practice:'版本化配置并先校验后替换，支持灰度与回滚，记录生效版本和来源'},
];

const python:Topic[]=[
  {roleId:'python-backend',prefix:'py',category:'Python 基础',name:'Python 可变默认参数',level:'junior',tags:['Python 语言'],definition:'函数默认参数在定义时求值一次，而不是每次调用都重新创建',mechanism:'函数对象保存 defaults 元组，后续未传参数的调用复用其中同一对象',boundary:'不可变默认值通常安全，可变默认值只有在刻意共享状态时才合理',failure:'列表或字典跨请求累积数据，造成难以复现的状态串用',practice:'使用 None 作为哨兵并在函数内创建新对象，为共享缓存使用显式结构'},
  {roleId:'python-backend',prefix:'py',category:'Python 数据模型',name:'描述符协议',level:'senior',tags:['Python 语言','数据模型'],definition:'描述符通过 __get__、__set__ 或 __delete__ 定制属性访问行为',mechanism:'属性查找时数据描述符优先于实例字典，非数据描述符在实例字典之后',boundary:'适合校验、惰性属性和 ORM 字段，简单属性不必引入复杂协议',failure:'存储名冲突引发递归访问，或忽略绑定类时 __get__ 的返回语义',practice:'用 __set_name__ 分配私有存储名，保持错误清楚并为查找优先级写测试'},
  {roleId:'python-backend',prefix:'py',category:'Python 数据模型',name:'Python MRO 与 super',level:'mid',tags:['Python 语言','继承'],definition:'MRO 定义多继承中类与方法的线性查找顺序，super 沿该顺序协作调用',mechanism:'C3 线性化保持局部优先和单调性，每个类调用 super 把控制交给下一项',boundary:'适合可协作的 mixin，状态复杂的多继承通常更适合组合',failure:'某个类直接点名父类破坏调用链，或方法签名不兼容导致参数传递失败',practice:'让 mixin 职责单一并统一签名，所有参与者都用 super 且覆盖菱形继承测试'},
  {roleId:'python-backend',prefix:'py',category:'Python 运行时',name:'Python 引用计数与循环 GC',level:'mid',tags:['运行时','内存'],definition:'CPython 主要用引用计数及时回收对象，并用循环 GC 处理容器引用环',mechanism:'引用数归零立即释放，分代循环检测器查找无法从外部到达的对象组',boundary:'实现细节不属于所有 Python 解释器保证，析构时机不应承载关键资源正确性',failure:'缓存和全局容器长期持有对象，含 finalizer 的复杂环使清理时机难预测',practice:'资源使用上下文管理器，借助 tracemalloc 和对象图比较增长路径'},
  {roleId:'python-backend',prefix:'py',category:'Python 异步',name:'asyncio 任务取消',level:'mid',tags:['异步','并发'],definition:'任务取消通过在下一个可暂停点注入 CancelledError 请求协程尽快退出',mechanism:'cancel 只发出请求，协程需运行到 await 并在 finally 中释放资源后才完成取消',boundary:'适合协作式 I/O 并发，CPU 密集或不让出控制权的代码无法及时响应',failure:'吞掉 CancelledError 让超时失效，或子任务脱离父任务成为后台泄漏',practice:'设置整体超时并传播取消，在 finally 清理资源，使用 TaskGroup 管理子任务'},
  {roleId:'python-backend',prefix:'py',category:'Python 异步',name:'asyncio TaskGroup',level:'senior',tags:['异步','结构化并发'],definition:'TaskGroup 把一组异步任务约束在上下文生命周期中统一等待和失败处理',mechanism:'任一子任务异常会取消其余任务，退出上下文时以异常组汇总失败',boundary:'适合必须共同完成的并行步骤，独立守护任务需要单独生命周期管理',failure:'子任务屏蔽取消导致组无法退出，或异常组未按类型拆分处理',practice:'把相关任务放进同一组，限制每个任务的超时并让清理路径可取消安全'},
  {roleId:'python-backend',prefix:'py',category:'Python Web',name:'WSGI 与 ASGI',level:'mid',tags:['Web','协议'],definition:'WSGI 定义同步 Python Web 调用接口，ASGI 扩展到异步和长连接事件模型',mechanism:'WSGI 以一次请求调用应用，ASGI 用 scope、receive、send 交换多次事件',boundary:'ASGI 适合 WebSocket 与高 I/O 并发，但同步依赖仍可能阻塞事件循环',failure:'在异步处理器直接执行阻塞数据库或 CPU 工作，拖慢全部连接',practice:'按依赖能力选择部署栈，把阻塞调用放入受控线程池并监控事件循环延迟'},
  {roleId:'python-backend',prefix:'py',category:'Python 工程',name:'Python 依赖锁定',level:'mid',tags:['工程化','供应链'],definition:'依赖锁定记录解析后的确切版本与哈希，使不同环境安装结果可重复',mechanism:'解析器依据声明范围生成锁文件，安装器按平台标记选择并校验制品',boundary:'应用适合严格锁定，供他人引用的库仍需保留合理兼容范围',failure:'只锁直接依赖、忽略平台差异，或长期不更新使安全修复无法进入',practice:'提交锁文件并在 CI 重建验证，自动化小步升级并审查来源与哈希'},
  {roleId:'python-backend',prefix:'py',category:'Python 工程',name:'Python 类型收窄',level:'mid',tags:['类型','工程化'],definition:'类型收窄根据运行时条件把联合类型缩小为当前分支内更具体的类型',mechanism:'检查器识别 isinstance、None 判断、字面量和用户定义 TypeGuard',boundary:'静态类型提升可维护性但不会自动验证外部 JSON 等运行时数据',failure:'用 cast 强行消除错误，或自定义 TypeGuard 的实现与声明不一致',practice:'在输入边界解析校验，用穷尽分支和类型测试维持声明与运行时一致'},
  {roleId:'python-backend',prefix:'py',category:'Python 性能',name:'tracemalloc 内存追踪',level:'senior',tags:['性能','诊断'],definition:'tracemalloc 记录 Python 内存分配调用栈并支持快照差异比较',mechanism:'启用后按 traceback 聚合当前跟踪块，快照可按文件或代码行对比增长',boundary:'主要观察 Python 分配器内存，原生扩展和进程 RSS 仍需其他工具',failure:'只看单次快照最大项，误把正常缓存或分配器保留当成泄漏',practice:'稳定负载下取得基线和多次快照，过滤噪声并验证对象是否持续不可回收'},
  {roleId:'python-backend',prefix:'py',category:'Python 性能',name:'Python 多进程并行',level:'mid',tags:['性能','并发'],definition:'多进程使用独立解释器和地址空间绕过单进程 GIL 执行 CPU 密集工作',mechanism:'任务和结果需序列化跨进程传输，操作系统负责调度和内存隔离',boundary:'适合粒度足够大的 CPU 任务，小任务或巨大数据传输可能得不偿失',failure:'进程数超过 CPU 与内存容量，序列化成为瓶颈，或子进程资源未回收',practice:'批量提交任务并限制 worker，减少复制，设置超时并处理异常进程重建'},
  {roleId:'python-backend',prefix:'py',category:'Python 架构',name:'Python 后台任务幂等',level:'senior',tags:['架构','消息'],definition:'后台任务幂等保证同一业务任务被重复投递时最终副作用仍只生效一次',mechanism:'稳定业务键配合唯一约束、条件状态迁移或已处理记录原子去重',boundary:'幂等不代表可以忽略顺序，不可逆外部副作用仍需供应方支持幂等键',failure:'任务超时但实际已成功，重试再次扣款；去重记录与业务提交分属两个事务',practice:'把状态与去重原子提交，区分可重试错误并保留对账与人工补偿通道'},
  {roleId:'python-backend',prefix:'py',category:'Python 安全',name:'Python 反序列化安全',level:'senior',tags:['安全','数据'],definition:'不可信反序列化风险来自输入可触发对象构造、代码执行或资源消耗',mechanism:'pickle 等格式可编码任意对象还原指令，解析时会导入并调用可执行逻辑',boundary:'pickle 只适合完全可信且版本受控的数据，跨边界应使用受限数据格式',failure:'把签名缺失的缓存或上传文件直接 unpickle，导致远程代码执行',practice:'使用 JSON 等数据格式并做模式校验，需要 pickle 时验证来源、签名并隔离权限'},
];

const qa:Topic[]=[
  {roleId:'qa',prefix:'qa',category:'测试设计',name:'状态迁移测试',level:'mid',tags:['测试设计'],definition:'状态迁移测试把系统建模为状态、事件和合法或非法迁移来设计用例',mechanism:'用状态图或状态表枚举前置状态、触发动作、目标状态和守卫条件',boundary:'适合订单、审批和协议等有明确生命周期的功能，不必用于纯计算函数',failure:'只验证主路径，遗漏重复事件、越级操作、并发迁移和失败后的中间状态',practice:'从领域规则生成迁移矩阵，覆盖非法迁移、幂等重放和持久化恢复'},
  {roleId:'qa',prefix:'qa',category:'测试设计',name:'组合测试与 Pairwise',level:'mid',tags:['测试设计'],definition:'组合测试用较少用例覆盖参数之间指定强度的取值交互',mechanism:'Pairwise 确保任意两个参数取值组合至少出现一次，再叠加关键高阶组合',boundary:'适合配置矩阵和兼容性，不适合有严格业务依赖时直接机械生成',failure:'忽略无效组合约束，或误以为两两覆盖能发现所有三阶以上缺陷',practice:'先建参数与约束模型，对高风险交互提升覆盖强度并补充领域场景'},
  {roleId:'qa',prefix:'qa',category:'测试设计',name:'基于风险的测试',level:'senior',tags:['策略','风险'],definition:'基于风险的测试按失败概率和业务影响分配有限验证资源',mechanism:'结合变更范围、复杂度、历史缺陷、使用频率和损失形成优先级',boundary:'适合发布决策与回归裁剪，但低风险不等于永远不测试',failure:'风险评分只靠主观印象，忽略安全合规和低频高损事件',practice:'让产品、开发和测试共同评审风险，记录依据并用线上结果校准模型'},
  {roleId:'qa',prefix:'qa',category:'接口测试',name:'契约兼容性测试',level:'senior',tags:['接口','微服务'],definition:'契约兼容性测试验证提供者变更仍满足已发布消费者的请求响应期望',mechanism:'消费者生成可版本化契约，提供者在 CI 对每个活跃契约执行验证',boundary:'适合服务边界兼容，不替代真实网络、鉴权和完整业务链路测试',failure:'契约只由提供者编写失去消费者视角，或删除仍在使用的旧字段语义',practice:'在部署前检查兼容矩阵，跟踪消费者版本并为废弃字段设置迁移窗口'},
  {roleId:'qa',prefix:'qa',category:'自动化测试',name:'测试数据工厂',level:'mid',tags:['自动化','数据'],definition:'测试数据工厂用声明式默认值和少量覆盖创建满足场景的独立数据',mechanism:'构建器集中处理必填关系、唯一值和清理，让用例只表达相关差异',boundary:'适合大量自动化场景，但不能掩盖生产数据分布和迁移问题',failure:'共享固定数据导致并发冲突，工厂默认值过多让测试意图不可见',practice:'每例生成隔离数据并自动清理，保留最小默认值且允许显式关联对象'},
  {roleId:'qa',prefix:'qa',category:'自动化测试',name:'视觉回归测试',level:'mid',tags:['自动化','前端'],definition:'视觉回归测试比较界面渲染结果以发现布局、样式和资源变化',mechanism:'在受控浏览器环境截图并与基线做像素或感知差异，再由人审核更新',boundary:'适合稳定组件与关键页面，不擅长验证交互语义和动态内容正确性',failure:'字体、动画和时间数据造成噪声，团队习惯无脑接受全部基线更新',practice:'固定视口与依赖，屏蔽动态区域，按组件分层并强制人工审查差异'},
  {roleId:'qa',prefix:'qa',category:'自动化测试',name:'属性测试',level:'senior',tags:['自动化','测试设计'],definition:'属性测试描述对大量输入都应成立的不变量，而非只列举少数示例',mechanism:'框架生成多样输入，发现失败后自动缩减为更小的反例',boundary:'适合编解码、排序和状态机，不变量不清的展示型功能收益较低',failure:'属性写成实现复述导致同错，或生成器无法覆盖真实有效输入空间',practice:'从可逆性、幂等性和模型一致性提炼属性，把反例固化为回归测试'},
  {roleId:'qa',prefix:'qa',category:'性能测试',name:'开放模型与封闭模型压测',level:'senior',tags:['性能','模型'],definition:'开放模型按外部到达率发请求，封闭模型由固定并发用户完成后再发下一次',mechanism:'开放模型能在系统变慢时形成排队，封闭模型会因响应变慢自动降低到达率',boundary:'前者适合真实流量与过载，后者适合并发会话，两者指标不可直接混用',failure:'用固定线程模型测试开放互联网流量，产生协调遗漏并高估系统容量',practice:'按业务到达过程选模型，校正负载发生器并同时报告吞吐、延迟和积压'},
  {roleId:'qa',prefix:'qa',category:'性能测试',name:'尾延迟分析',level:'senior',tags:['性能','诊断'],definition:'尾延迟关注最慢少数请求对用户体验和分布式调用整体耗时的影响',mechanism:'串并行调用会放大慢节点概率，排队、GC、锁与依赖抖动共同形成长尾',boundary:'P95 与 P99 需结合样本量和窗口，单一百分位不能解释根因',failure:'只看平均值掩盖严重慢请求，或客户端超时让服务端统计遗漏最慢样本',practice:'端到端和分段同时记录分位数，用关联 ID 追踪慢样本并控制排队时间'},
  {roleId:'qa',prefix:'qa',category:'质量工程',name:'变异测试',level:'senior',tags:['质量','单元测试'],definition:'变异测试主动修改生产代码的小处逻辑来检验测试是否能捕获真实错误',mechanism:'工具生成条件反转、常量替换等 mutant，测试未失败的称为存活变异',boundary:'适合关键纯逻辑，完整运行成本高且等价变异需要人工判断',failure:'追求分数而补脆弱断言，或把无法杀死的等价变异当成测试缺陷',practice:'优先覆盖高风险模块，分析存活变异背后的缺失行为并设增量门禁'},
  {roleId:'qa',prefix:'qa',category:'CI 质量',name:'测试影响分析',level:'senior',tags:['CI/CD','效率'],definition:'测试影响分析依据代码变更和依赖关系选择最可能受影响的测试集合',mechanism:'静态依赖、覆盖映射和历史失败数据共同计算受影响范围与风险',boundary:'适合加速提交反馈，发布前仍需周期性全量回归防止漏边',failure:'依赖图过期漏测反射或配置影响，团队因快速绿色误判发布安全',practice:'增量阶段选择测试并保留全量兜底，持续统计漏选率和节省时间'},
  {roleId:'qa',prefix:'qa',category:'安全测试',name:'威胁建模驱动测试',level:'senior',tags:['安全','策略'],definition:'威胁建模从资产、信任边界和攻击路径推导需要验证的安全控制',mechanism:'数据流图配合 STRIDE 等分类识别威胁，再映射到可执行滥用用例',boundary:'适合设计与重大变更阶段，不替代代码审计、扫描和渗透测试',failure:'只画图不跟踪修复，或只关注外部攻击忽略内部权限与供应链',practice:'让跨职能团队评审边界，为每个高风险威胁指定控制、测试和负责人'},
  {roleId:'qa',prefix:'qa',category:'可靠性测试',name:'故障注入验证',level:'senior',tags:['可靠性','混沌工程'],definition:'故障注入通过可控地破坏依赖、资源或网络来验证系统韧性假设',mechanism:'在限定爆炸半径内注入延迟、错误或实例终止并观察稳态指标',boundary:'适合已有监控与回滚能力的系统，不应在未知保护边界下直接扩大范围',failure:'没有停止条件、注入器本身失控，或实验只证明告警响却未验证用户结果',practice:'先定义假设和稳态，从测试环境到小流量递进，自动中止并跟踪改进项'},
];

const devops:Topic[]=[
  {roleId:'devops',prefix:'ops',category:'Linux',name:'Linux 内存压力与 OOM',level:'mid',tags:['Linux','排障'],definition:'内存压力表示可回收页不足并迫使内核回收、交换或最终触发 OOM 处置',mechanism:'内核扫描页缓存和匿名页，直接回收失败时依据评分选择进程终止',boundary:'available 比 free 更能反映余量，容器还受 cgroup 独立上限约束',failure:'只看宿主机内存忽略容器限制，或盲目关闭 swap 让突发更快 OOM',practice:'关联 PSI、缺页、swap 和工作集，先止损再定位泄漏、缓存或容量不足'},
  {roleId:'devops',prefix:'ops',category:'Linux',name:'Linux I/O 延迟排查',level:'senior',tags:['Linux','排障'],definition:'I/O 延迟排查区分应用等待、文件系统、块设备和底层存储各层瓶颈',mechanism:'请求经过页缓存、文件系统和块层队列，最终由设备完成并返回',boundary:'高利用率不总是瓶颈，设备并行能力和请求大小会改变指标含义',failure:'只看吞吐忽略等待分位数，或把写缓存的快速返回当成持久化完成',practice:'从进程 I/O 和 iowait 下钻到队列与设备延迟，结合工作负载类型验证'},
  {roleId:'devops',prefix:'ops',category:'网络',name:'TCP 连接队列',level:'mid',tags:['网络','Linux'],definition:'TCP 监听端通过半连接和已完成连接队列承接握手与等待应用 accept',mechanism:'SYN 到达创建握手状态，三次握手完成后进入 accept 队列等待应用取走',boundary:'队列参数只能缓冲突发，应用处理慢或攻击持续时仍会溢出',failure:'backlog 太小、accept 不及时或 SYN flood 导致连接超时与重传',practice:'同时检查监听队列溢出、握手状态和应用延迟，配合限流与容量治理'},
  {roleId:'devops',prefix:'ops',category:'网络',name:'DNS 故障定位',level:'mid',tags:['网络','排障'],definition:'DNS 故障定位需要区分客户端缓存、递归解析、权威记录和网络路径',mechanism:'客户端按搜索域和缓存查询递归服务器，递归服务器沿委派链获得权威答案',boundary:'TTL 控制缓存而非保证立即切换，负缓存也可能延长失败影响',failure:'记录改动未考虑旧 TTL、分裂视图不一致，或 UDP 分片被网络设备丢弃',practice:'从实际客户端按层查询并记录响应者、rcode、TTL 和链路，变更前降低 TTL'},
  {roleId:'devops',prefix:'ops',category:'容器',name:'cgroup v2 资源控制',level:'senior',tags:['容器','Linux'],definition:'cgroup v2 用统一层级统计和限制进程组的 CPU、内存与 I/O 资源',mechanism:'控制文件定义权重、上限和压力，进程归属决定资源消耗计入哪个组',boundary:'限制提供隔离但不能创造容量，过紧配额会造成节流或 OOM',failure:'只设 limit 不设 request 基线，CPU 节流被误判为应用计算变慢',practice:'按工作集和 SLO 配置资源，监控 cgroup 节流、OOM 与 PSI 并压测校准'},
  {roleId:'devops',prefix:'ops',category:'Kubernetes',name:'Kubernetes 调度约束',level:'mid',tags:['Kubernetes','调度'],definition:'调度约束用资源请求、亲和性、污点和拓扑规则筛选并排序可运行节点',mechanism:'调度器先过滤不可行节点，再按评分插件选节点并完成绑定',boundary:'硬约束保证放置但可能让 Pod 无处可去，软约束更灵活却不保证满足',failure:'互相冲突的亲和规则造成 Pending，或请求不准导致碎片和热点',practice:'以资源请求为基础，优先软约束，监控不可调度原因并验证故障域分散'},
  {roleId:'devops',prefix:'ops',category:'Kubernetes',name:'Kubernetes 探针语义',level:'mid',tags:['Kubernetes','可用性'],definition:'启动、就绪和存活探针分别判断是否启动完成、能否接流量和是否需重启',mechanism:'kubelet 周期执行检查，就绪失败移出服务端点，存活失败触发容器重启',boundary:'探针只能观察配置的信号，不能代替端到端 SLO 与依赖健康治理',failure:'存活探针依赖脆弱下游引发重启风暴，阈值过紧放大发布抖动',practice:'启动探针覆盖慢启动，就绪反映服务能力，存活只检测不可自愈的僵死'},
  {roleId:'devops',prefix:'ops',category:'Kubernetes',name:'Kubernetes 驱逐与 PDB',level:'senior',tags:['Kubernetes','可靠性'],definition:'驱逐在资源压力或维护时终止 Pod，PDB 限制自愿中断期间可同时不可用数量',mechanism:'节点控制器和 kubelet依据条件驱逐，维护工具在驱逐 API 上检查 PDB',boundary:'PDB 不防节点故障等非自愿中断，也不能保证应用本身已经就绪',failure:'PDB 过严阻塞升级，副本跨故障域不足导致一次故障仍全部丢失',practice:'按最小可用容量设计副本和 PDB，结合拓扑分散并演练节点维护'},
  {roleId:'devops',prefix:'ops',category:'CI/CD',name:'数据库向后兼容发布',level:'senior',tags:['发布','数据库'],definition:'向后兼容发布让新旧应用版本在滚动期间都能使用同一数据库结构',mechanism:'先扩展表结构，再部署兼容读写与回填，最后收缩旧字段和约束',boundary:'适合滚动和灰度发布，破坏性 DDL 不能与旧代码同一阶段完成',failure:'先删列或改语义导致旧实例报错，回填锁表或双写结果不一致',practice:'采用 expand-migrate-contract，监控双读差异并为每阶段准备回滚'},
  {roleId:'devops',prefix:'ops',category:'可观测性',name:'OpenTelemetry 采样',level:'senior',tags:['可观测性','追踪'],definition:'追踪采样控制哪些请求的 span 被记录和导出以平衡可见性与成本',mechanism:'头部采样在请求开始决定，尾部采样汇总整条轨迹后按错误或延迟选择',boundary:'尾部采样信息更完整但需要缓存和集中决策，头部采样更简单低延迟',failure:'低比例随机采样漏掉稀有错误，或服务间采样决定不一致造成断链',practice:'传播统一采样上下文，对错误和高延迟保留更高概率并监控丢弃率'},
  {roleId:'devops',prefix:'ops',category:'可靠性',name:'多窗口燃尽率告警',level:'senior',tags:['SRE','告警'],definition:'多窗口燃尽率告警判断错误预算在长短时间尺度上是否被过快消耗',mechanism:'短窗口快速发现突发，长窗口确认持续影响，两者同时越阈值才告警',boundary:'适合有明确 SLO 的用户结果告警，不替代资源和容量诊断指标',failure:'只按瞬时错误率频繁报警，或窗口过长导致预算耗尽后才发现',practice:'从 SLO 和响应时限推导阈值，分级通知并用历史事件校准噪声'},
  {roleId:'devops',prefix:'ops',category:'可靠性',name:'灾难恢复 RPO 与 RTO',level:'senior',tags:['容灾','SRE'],definition:'RPO 定义可接受数据丢失窗口，RTO 定义中断后恢复服务的时间目标',mechanism:'复制和备份影响数据恢复点，自动化切换、基础设施和演练影响恢复时间',boundary:'更小目标意味着更高成本，且必须针对具体业务和故障范围定义',failure:'有备份却从未验证恢复，跨地域复制把逻辑删除也同步过去',practice:'把目标映射到架构和责任人，定期做隔离恢复演练并测量真实达成时间'},
  {roleId:'devops',prefix:'ops',category:'云安全',name:'软件供应链签名与 SBOM',level:'senior',tags:['安全','供应链'],definition:'制品签名证明来源和完整性，SBOM 列出构建产物包含的组件与版本',mechanism:'构建身份对不可变摘要签名，部署策略验证签名并用 SBOM 关联漏洞',boundary:'签名不证明代码无漏洞，SBOM 质量取决于构建过程能否完整采集依赖',failure:'密钥长期共享、只签标签不签摘要，或生成 SBOM 后从不用于响应',practice:'使用短期工作负载身份和可验证构建，在准入阶段校验并持续扫描组件'},
];

export const EXPANDED_QUESTION_BANK:Question[]=expand([...java,...frontend,...golang,...python,...qa,...devops]);
