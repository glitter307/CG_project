
var Game = function () {
    this.config = {
        background: 0xFFFACD,
        ground: -1,
        fallingSpeed: 0.2,
        cubeColor: 0xC48FCD,
        cubeWidth: 4,
        cubeHeight: 2,
        cubeDeep: 4,
        jumperColor: 0x232323,
        jumperWidth: 1,
        jumperHeight: 2,
        jumperDeep: 1
    };
    this.cubes = [];
    this.score = 0;
    this.size = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    //三组件
    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(
        this.size.width / -80,
        this.size.width / 80,
        this.size.height / 80,
        this.size.height / -80,
        0, 5000
    );

    this.renderer = new THREE.WebGLRenderer({antialias: true});

    this.cameraPos = {
        current: new THREE.Vector3(0, 0, 0),
        next: new THREE.Vector3()
    };
    this.cubeStat = {
        nextDir: ""
    };
    this.jumperStat = {
        ready: false,//鼠标按完没有
        xSpeed: 0,
        ySpeed: 0
    };
    this.falledStat = {
        location: -1,//-1当前立方体
        distance: 0
    };
    this.fallingStat = {
        speed: 0.2,
        end: false//是否触地
    };
};

Game.prototype = {
    init: function () {
        this.setCamera();
        this.setRenderer();
        this.setLight();
        this.setInit();
        this.createCube();
        this.createCube();
        this.createJumper();
        this.updateCamera();
        var self=this;


        var canvas = document.querySelector("canvas");
        canvas.addEventListener("mousedown", function() {
            self.handleMousedown();
        });
        // 监听鼠标松开的事件
        canvas.addEventListener("mouseup", function(evt) {
            self.handleMouseup();
        });
        // 监听窗口变化的事件
        window.addEventListener("resize", function() {
            self.handleWindowResize();
        });
    },
       restart: function () {
        this.score = 0;
        this.cameraPos = {
            current: new THREE.Vector3(0, 0, 0),
            next: new THREE.Vector3()
        };
        this.fallingStat = {
            speed: 0.2,
            end: false
        };
        var length = this.cubes.length;
        for (var i = 0; i < length; i++) {
            this.scene.remove(this.cubes.pop());
        }
        this.scene.remove(this.jumper);
        //显示的分数设为0
        this.successCallback(this.score);
        this.createCube();
        this.createCube();
        this.createJumper();
        this.updateCamera();
    },
    //游戏成功的执行函数，外部传入
    addSuccessFn: function (fn) {
        this.successCallback = fn;
    },
    //失败
    addFailedFn: function (fn) {
        this.failedCallback = fn;
    },

    handleMousedown: function () {
        var self = this;
        // mesh.scale可以设置网格对象的XYZ尺寸
        if (!self.jumperStat.ready) {//&& self.jumper.scale.y > 0.02
            self.jumper.scale.y -= 0.01;//实现jumper高度变化

            // 根据鼠标down的时长来简单映射jumper的水平和垂直速度
            self.jumperStat.xSpeed += 0.004;
            self.jumperStat.ySpeed += 0.008;

            self.render(self.scene, self.camera);
            requestAnimationFrame(function () {
                self.handleMousedown();
            });
        }
    },


    // 鼠标松开或触摸结束绑定的函数
    handleMouseup: function () {
        var self = this;
        // 标记鼠标已经松开
        self.jumperStat.ready = true;
        // 判断jumper是在方块水平面之上，是的话说明需要继续运动
        if (self.jumper.position.y >= 1) {
            // jumper根据下一个方块的位置来确定水平运动方向,其实运动方向用于是世界坐标系的XZ轴负方向
            if (self.cubeStat.nextDir === "left") {
                self.jumper.position.x -= self.jumperStat.xSpeed;
            } else {
                self.jumper.position.z -= self.jumperStat.xSpeed;
            }
            // jumper在垂直方向上运动，注意速度的递减来模拟地球引力
            self.jumper.position.y += self.jumperStat.ySpeed;
            // 运动伴随着缩放
            if (self.jumper.scale.y < 1) {
                self.jumper.scale.y += 0.02;
            }
            // jumper在垂直方向上先上升后下降，其实在jumper落到立方体时会陷入0.01的距离
            self.jumperStat.ySpeed -= 0.01;
            // 每一次的变化，渲染器都要重新渲染，才能看到渲染效果
            self.render(self.scene, self.camera);
            requestAnimationFrame(function () {
                self.handleMouseup();
            });
        } else {
            // jumper掉落到方块水平位置，开始重置状态，并开始判断掉落是否成功
            self.jumperStat.ready = false;
            self.jumperStat.xSpeed = 0;
            self.jumperStat.ySpeed = 0;
            self.jumper.position.y = 1;
            self.checkInCube();
            if (self.falledStat.location === 1) {
                // 掉落成功，进入下一步
                self.score++;
                self.createCube();
                self.updateCamera();

                if (self.successCallback) {
                    self.successCallback(self.score);
                }
            } else {
                // 掉落失败，进入失败动画
                self.falling();
            }
        }
    },

    handleWindowResize: function () {
        this.setSize();
        this.camera.left = this.size.width / -80;
        this.camera.right = this.size.width / 80;
        this.camera.top = this.size.height / 80;
        this.camera.bottom = this.size.height / -80;
        this.camera.updateProjectionMatrix();
        this.camera.setSize(this.size.width, this.size.height);
        this.render();
    },

    falling: function () {
        var self = this;
        if (self.falledStat.location === 0) {
            self.fallingRotate("none");
        } else if (self.falledStat.location === -10) {
            //表示落在起跳立方体周围
            if (self.cubeStat.nextDir === "left") {
                self.fallingRotate("leftTop");
            } else {
                self.fallingRotate("rightTop");
            }
        } else if (self.falledStat.location === 10) {
            //表示落在目的立方体周围
            if (self.cubeStat.nextDir === "left") {
                if (
                    // 如果jumper在最后一个立方体的左边区域
                    self.jumper.position.x < self.cubes[self.cubes.length - 1].position.x
                ) {
                    self.fallingRotate("leftTop");
                } else {
                    self.fallingRotate("leftBottom");
                }
            } else {
                if (
                    //如果jumper在最后一个立方体的后方区域
                    self.jumper.position.z < self.cubes[self.cubes.length - 1].position.z
                ) {
                    self.fallingRotate("rightTop");
                } else {
                    self.fallingRotate("rightBottom");
                }
            }
        }

    },
    fallingRotate: function (dir) {
        var self = this;
        var offset = self.falledStat.distance - self.config.cubeWidth / 2;
        var rotateAxis = "z"; // 旋转轴
        var rotateAdd = self.jumper.rotation[rotateAxis] + 0.1; // 旋转速度
        var rotateTo = self.jumper.rotation[rotateAxis] < Math.PI / 2; // 旋转结束的弧度
        var fallingTo = self.config.ground + self.config.jumperWidth / 2 + offset;

        if (dir === "rightTop") {
            rotateAxis = "x";
            rotateAdd = self.jumper.rotation[rotateAxis] - 0.1;
            rotateTo = self.jumper.rotation[rotateAxis] > -Math.PI / 2;
            self.jumper.geometry.translate.z = offset;
        } else if (dir === "rightBottom") {
            rotateAxis = "x";
            rotateAdd = self.jumper.rotation[rotateAxis] + 0.1;
            rotateTo = self.jumper.rotation[rotateAxis] < Math.PI / 2;
            self.jumper.geometry.translate.z = -offset;
        } else if (dir === "leftBottom") {
            rotateAxis = "z";
            rotateAdd = self.jumper.rotation[rotateAxis] - 0.1;
            rotateTo = self.jumper.rotation[rotateAxis] > -Math.PI / 2;
            self.jumper.geometry.translate.x = -offset;
        } else if (dir === "leftTop") {
            rotateAxis = "z";
            rotateAdd = self.jumper.rotation[rotateAxis] + 0.1;
            rotateTo = self.jumper.rotation[rotateAxis] < Math.PI / 2;
            self.jumper.geometry.translate.x = offset;
        } else if (dir === "none") {
            rotateTo = false;
            fallingTo = self.config.ground;
        } else {
            throw Error("Arguments Error");
        }

        // 还在继续执行坠落动作
        if (!self.fallingStat.end) {
            // 旋转角度不够，继续按照设定的轴旋转
            if (rotateTo) {
                self.jumper.rotation[rotateAxis] = rotateAdd;
            } else if (self.jumper.position.y > fallingTo) {
                //fallingTo表示当jumper在空白区坠入地面，则不作旋转，而修改Y轴位置直到坠地
                self.jumper.position.y -= self.config.fallingSpeed;
            } else {
                self.fallingStat.end = true;
            }
            self.render();
            requestAnimationFrame(function() {
                self.falling();
            });
        } else {
            if (self.failedCallback) {
                self.failedCallback();
            }
        }
    },
    checkInCube: function () {
        if (this.cubes.length > 1) {
            var point0 = {
                x: this.jumper.position.x,
                z: this.jumper.position.z
            };
            var pointA = {
                x: this.cubes[this.cubes.length - 1 - 1].position.x,
                z: this.cubes[this.cubes.length - 1 - 1].position.z
            };
            var pointB = {
                x: this.cubes[this.cubes.length - 1].position.x,
                z: this.cubes[this.cubes.length - 1].position.z
            };
            var distanceS, distanceL;
            if (this.cubeStat.nextDir === "left") {
                distanceS = Math.abs(point0.x - pointA.x);
                distanceL = Math.abs(point0.x - pointB.x);
            } else {
                distanceS = Math.abs(point0.z - pointA.z);
                distanceL = Math.abs(point0.z - pointB.z);
            }

            var should = this.config.cubeWidth / 2 + this.config.jumperWidth / 2;
            var result = 0;
            if (distanceS < should) {
                this.falledStat.distance = distanceS;
                result = distanceS < this.config.cubeWidth / 2 ? -1 : -10;
            } else if (distanceL < should) {
                this.falledStat.distance = distanceL;
                result = distanceL < this.config.cubeWidth / 2 ? 1 : 10;
            } else {
                result = 0;
            }
            this.falledStat.location = result;
        }
    },
    createJumper: function () {
        var geometry = new THREE.CubeGeometry(
            this.config.jumperWidth,
            this.config.jumperHeight,
            this.config.jumperDeep
        );
        geometry.translate(0, 1, 0);
        var material = new THREE.MeshLambertMaterial({
            color: this.config.jumperColor
        });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.y=1;
        this.jumper = mesh;
        this.scene.add(this.jumper);
    },
    createCube: function () {
        var geometry = new THREE.CubeGeometry(
            this.config.cubeWidth,
            this.config.cubeHeight,
            this.config.cubeDeep
        );
        var material = new THREE.MeshLambertMaterial({
            color: this.config.cubeColor
        });
        var mesh = new THREE.Mesh(geometry, material);
        //下一方块的位置
        if (this.cubes.length) {
            var random = Math.random();
            this.cubeStat.nextDir = random > 0.5 ? "left" : "right";
            mesh.position.x = this.cubes[this.cubes.length - 1].position.x;
            mesh.position.y = this.cubes[this.cubes.length - 1].position.y;
            mesh.position.z = this.cubes[this.cubes.length - 1].position.z;
            if (this.cubeStat.nextDir === "left") {
                mesh.position.x = this.cubes[this.cubes.length - 1].position.x - 4 * Math.random() - 6;
            } else {
                mesh.position.z = this.cubes[this.cubes.length - 1].position.z - 4 * Math.random() - 6;
            }
        }
        this.cubes.push(mesh);
        this.scene.add(mesh);
        if (this.cubes.length > 1) {
            this.updateCameraPos();
        }
    },
    updateCameraPos: function () {
        var lastIndex = this.cubes.length - 1;
        var pointA = {
            x: this.cubes[lastIndex].position.x,
            z: this.cubes[lastIndex].position.z
        };
        var pointB = {
            x: this.cubes[lastIndex - 1].position.x,
            z: this.cubes[lastIndex - 1].position.z
        };
        var pointR = new THREE.Vector3();

        pointR.x = (pointA.x + pointB.x) / 2;
        pointR.y = 0;
        pointR.z = (pointA.z + pointB.z) / 2;
        this.cameraPos.next = pointR;
    },
    updateCamera: function () {
        var self = this;
        var c = {
            x: self.cameraPos.current.x,
            y: self.cameraPos.current.y,
            z: self.cameraPos.current.z
        };
        var n = {
            x: self.cameraPos.next.x,
            y: self.cameraPos.next.y,
            z: self.cameraPos.next.z
        };

        // 很巧妙地动画，用于相机在最后两个立方体上移动到最佳位置
        if (c.x > n.x || c.z > n.z) {
            self.cameraPos.current.x -= 0.1;
            self.cameraPos.current.z -= 0.1;
            if (self.cameraPos.current.x - self.cameraPos.next.x < 0.05) {
                self.cameraPos.current.x = self.cameraPos.next.x;
            }
            if (self.cameraPos.current.z - self.cameraPos.next.z < 0.05) {
                self.cameraPos.current.z = self.cameraPos.next.z;
            }
            self.camera.lookAt(new THREE.Vector3(c.x, 0, c.z));
            self.render();
            requestAnimationFrame(function() {
                self.updateCamera();
            });
        }
    },
    setInit:function(){
        var plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry( 10000, 10000 ),
            new THREE.MeshBasicMaterial( { color: 0xffffff, opacity: 0.5, transparent: true } )
        );
        plane.rotation.x = - Math.PI / 2;
        this.scene.add( plane );

        // var materialColor = 0x0040C0;
        //
        // var geometry = new THREE.PlaneBufferGeometry( 512, 512, 127, 127 );
        //
        // // material: make a ShaderMaterial clone of MeshPhongMaterial, with customized vertex shader
        // var material = new THREE.ShaderMaterial( {
        //     uniforms: THREE.UniformsUtils.merge( [
        //         THREE.ShaderLib[ 'phong' ].uniforms,
        //         {
        //             heightmap: { value: null }
        //         }
        //     ] ),
        //     // vertexShader: document.getElementById( 'waterVertexShader' ).textContent,
        //     // fragmentShader: THREE.ShaderChunk[ 'meshphong_frag' ]
        //
        // } );
        //
        // material.lights = true;
        //
        // // Material attributes from MeshPhongMaterial
        // material.color = new THREE.Color( materialColor );
        // material.specular = new THREE.Color( 0x111111 );
        // material.shininess = 50;
        //
        // // Sets the uniforms with the material values
        // material.uniforms.diffuse.value = material.color;
        // material.uniforms.specular.value = material.specular;
        // material.uniforms.shininess.value = Math.max( material.shininess, 1e-4 );
        // material.uniforms.opacity.value = material.opacity;
        //
        // // Defines
        // // material.defines.WIDTH = WIDTH.toFixed( 1 );
        // // material.defines.BOUNDS = BOUNDS.toFixed( 1 );
        // //
        // // waterUniforms = material.uniforms;
        //
        // var waterMesh = new THREE.Mesh( geometry, material );
        // waterMesh.rotation.x = - Math.PI / 2;
        // waterMesh.matrixAutoUpdate = false;
        // waterMesh.updateMatrix();
        //
        // this.scene.add( waterMesh );
        //
        // // Mesh just for mouse raycasting
        // var geometryRay = new THREE.PlaneBufferGeometry( 512, 512, 1, 1 );
        // var meshRay = new THREE.Mesh( geometryRay, new THREE.MeshBasicMaterial( { color: 0xFFFFFF, visible: false } ) );
        // meshRay.rotation.x = - Math.PI / 2;
        // meshRay.matrixAutoUpdate = false;
        // meshRay.updateMatrix();
        // this.scene.add( meshRay );


        // Creates the gpu computation class and sets it up

        // var gpuCompute = new GPUComputationRenderer( 128, 128, renderer );
        //
        // var heightmap0 = gpuCompute.createTexture();

        // fillTexture( heightmap0 );
        //
        // heightmapVariable = gpuCompute.addVariable( "heightmap", document.getElementById( 'heightmapFragmentShader' ).textContent, heightmap0 );
        //
        // gpuCompute.setVariableDependencies( heightmapVariable, [ heightmapVariable ] );
        //
        // heightmapVariable.material.uniforms.mousePos = { value: new THREE.Vector2( 10000, 10000 ) };
        // heightmapVariable.material.uniforms.mouseSize = { value: 20.0 };
        // heightmapVariable.material.uniforms.viscosityConstant = { value: 0.03 };
        // heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed( 1 );
        //
        // var error = gpuCompute.init();
        // if ( error !== null ) {
        //     console.error( error );
        // }
    },
    // fillTexture:function(texture){
    //     var waterMaxHeight = 10;
    //
    //     function noise( x, y, z ) {
    //         var multR = waterMaxHeight;
    //         var mult = 0.025;
    //         var r = 0;
    //         var simplex = new SimplexNoise();
    //         for ( var i = 0; i < 15; i++ ) {
    //             r += multR * simplex.noise( x * mult, y * mult );
    //             multR *= 0.53 + 0.025 * i;
    //             mult *= 1.25;
    //         }
    //         return r;
    //     }
    //
    //     var pixels = texture.image.data;
    //
    //     var p = 0;
    //     for ( var j = 0; j < WIDTH; j++ ) {
    //         for ( var i = 0; i < WIDTH; i++ ) {
    //
    //             var x = i * 128 / WIDTH;
    //             var y = j * 128 / WIDTH;
    //
    //             pixels[ p + 0 ] = noise( x, y, 123.4 );
    //             pixels[ p + 1 ] = 0;
    //             pixels[ p + 2 ] = 0;
    //             pixels[ p + 3 ] = 1;
    //
    //             p += 4;
    //         }
    //     }
    // },
    setCamera: function () {
        this.camera.position.set(100, 100, 100);
        this.camera.lookAt(this.cameraPos.current);
    },
    setRenderer: function () {
        this.renderer.setClearColor(this.config.background);
        this.renderer.setSize(this.size.width, this.size.height);
        document.body.appendChild(this.renderer.domElement);
    },
    setLight: function () {
        var directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
        directionalLight.position.set(3, 10, 5);
        this.scene.add(directionalLight);

        var light = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(light);
    },
    setSize: function () {
        (this.size.width = window.innerWidth);
        (this.size.height = window.innerHeight);
    },
    render: function () {
        this.renderer.render(this.scene, this.camera);
    }
};