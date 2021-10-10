import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as CANNON from 'cannon-es'
import cannonDebugger from 'cannon-es-debugger'
import Stats from 'stats.js'
const canvas = document.querySelector('.webgl')

class Scene{
    constructor(){
        this._Init()
    }
    
    _Init(){
        this.stats = new Stats()
        this.stats.showPanel(0)
        document.body.appendChild(this.stats.dom)
        this.scene = new THREE.Scene()
        this.clock = new THREE.Clock()
        this.oldElapsedTime = 0
        this.objectsToUpdate = []
        this.thrusting = false
        this.mouse = new THREE.Vector2()
        this.distance = new THREE.Vector2()
        this.InitPhysics()
        //this.InitPhysicsDebugger()
        this.InitEnv()
        this.JoyStick()
        this.InitCamera()
        this.InitBuildingCreator()
        this.v = new THREE.Vector3()
        this.Car()
        this.InitLights()
        this.InitRenderer()
        //this.InitControls()
        this.Update()
        window.addEventListener('resize', () => {
            this.Resize()
        })
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = event.clientX / window.innerWidth * 2 - 1
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        })
        this.keyMap = {}
        this.hoverMap = {}
        this.hoverTouch = {}
        this.onDocumentKey = (e) => {
            this.keyMap[e.key] = e.type === 'keydown'
        }

        this.onDocumentHover = (e) => {
            //e.preventDefault()
            this.hoverMap[e.target.id] = e.type === 'mouseover'
            //console.log(this.hoverMap)
        }

        this.onDocumentTouch = (e) => {
            //e.preventDefault()
            this.hoverTouch[e.target.id] = e.type === 'touchstart'
            //console.log(this.hoverTouch)
        }
        

        this.forwardVel = 0
        this.rightVel = 0

        document.addEventListener('keydown', this.onDocumentKey, false)
        document.addEventListener('keyup', this.onDocumentKey, false)
        document.addEventListener('touchstart', this.onDocumentTouch, true )
        document.addEventListener('touchend', this.onDocumentTouch, false)
        document.addEventListener('mouseover', this.onDocumentHover, false)
        document.addEventListener('mouseout', this.onDocumentHover, false)
    }

    
    InitPhysics(){
        this.world = new CANNON.World()
        this.world.gravity.set(0, -40, 0)
        this.defaultMaterial = new CANNON.Material('default')
        this.defaultContactMaterial = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.1,
                restitution: 0.2
            }
        )
        this.world.defaultContactMaterial = this.defaultContactMaterial
        this.world.addContactMaterial(this.defaultContactMaterial)
    }

    InitPhysicsDebugger(){
        cannonDebugger(
            this.scene,
            this.world.bodies,
            {
                color: 0x00ff00,
                autoUpdate: true
            }
        )
    }

    InitEnv(){
        this.geometry = new THREE.PlaneBufferGeometry(1000, 1000, 2, 2)
        this.material = new THREE.MeshNormalMaterial({
            // wireframe: true, wireframeLinejoin: true, wireframeLinecap: true, wireframeLinewidth: 5
            })
        this.ground = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ color: 0x191919 }))
        this.scene.add(this.ground)
        this.ground.rotation.x = -Math.PI * 0.5

        //physics
        this.groundBody = new CANNON.Body({
            mass: 0,
            material: this.defaultMaterial
        })
        this.world.addBody(this.groundBody)
        this.groundBody.addShape(new CANNON.Plane())
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    }

    InitBuildingCreator(){
        this.rand = 10 + Math.random() * 25;
        this.buildingGeometry = new THREE.BoxBufferGeometry(10, this.rand, 10)
        
        for (let i = 0; i <= 100; i++){
            this.angle = Math.random() * Math.PI * 2
            this.radius = 10 + Math.random() * 400
            this.x = Math.cos(this.angle) * this.radius
            this.z = Math.sin(this.angle) * this.radius

            this.building = new THREE.Mesh(this.buildingGeometry, this.material)

            this.building.position.set(this.x, this.rand/2, this.z)
            this.scene.add(this.building)

            //bulding physics
            this.buildingBody = new CANNON.Body({
                mass: 0,
                material: this.defaultMaterial
            })
            this.buildingShape = new CANNON.Box(new CANNON.Vec3(5, this.rand/2, 5))
            this.buildingBody.addShape(this.buildingShape)
            this.buildingBody.position.set(this.x, this.rand/2, this.z)
            this.world.addBody(this.buildingBody)
            this.objectsToUpdate.push({
                mesh: this.building,
                body: this.buildingBody
            })
        }
    }

    Car(){
        this.group = new THREE.Group()
        this.box = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 2), this.material)
        this.topBox = new THREE.Mesh(new THREE.BoxBufferGeometry(0.5, 0.5, 0.5), this.material)
        this.poleFront = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.1, 0.1, 1.5), this.material)
        this.poleBack = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.1, 0.1, 1.5), this.material)
        this.group.add(this.poleFront)
        this.group.add(this.poleBack)
        this.group.add(this.box)
        this.group.add(this.topBox)
        this.topBox.position.set(0, 0.5, 0)
        this.poleFront.rotation.x = -Math.PI * 0.5
        this.poleFront.rotation.z = -Math.PI * 0.5
        this.poleFront.position.set(0.0, -0.5, -1.0)
        this.poleBack.rotation.x = -Math.PI * 0.5
        this.poleBack.rotation.z = -Math.PI * 0.5
        this.poleBack.position.set(0.0, -0.5, 1.0)
        

        // this.group.add(this.wheelsFL, this.wheelsFR, this.wheelsBL, this.wheelsBR)
        this.scene.add(this.group)
        this.group.add(this.chaseCam)
        this.group.position.set(0, 4, 0)

        this.carBodyShape = new CANNON.Box(new CANNON.Vec3(1, 0.25, 1.5))
        this.carBody = new CANNON.Body({
            mass: 40,
            material: this.defaultMaterial
        })
        this.carBody.addShape(this.carBodyShape)
        this.world.addBody(this.carBody)
        this.carBody.position.copy(this.box.position)
        this.carBody.angularDamping = 0.9
        this.objectsToUpdate.push({
            mesh: this.group,
            body: this.carBody
        })

        this.wheelGeometry = new THREE.CylinderBufferGeometry(0.33, 0.33, 0.2)
        this.wheelGeometry.rotateZ(Math.PI * 0.5)
        //Left Front Wheel
        this.wheelsFL = new THREE.Mesh(this.wheelGeometry, this.material)
        this.scene.add(this.wheelsFL)
        this.wheelsFL.position.set(-1, 3, -1)
        this.wheelsFLShape = new CANNON.Sphere(0.33)
        this.wheelsFLBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsFLBody.addShape(this.wheelsFLShape)
        this.wheelsFLBody.position.copy(this.wheelsFL.position)
        this.world.addBody(this.wheelsFLBody)
        this.wheelsFLBody.angularDamping = 0.4
        this.wheelsFLBody.applyLocalForce = 20
        this.objectsToUpdate.push({
            mesh: this.wheelsFL,
            body: this.wheelsFLBody
        })
        
        
        //Right Front Wheel
        this.wheelsFR = new THREE.Mesh(this.wheelGeometry, this.material)
        this.scene.add(this.wheelsFR)
        this.wheelsFR.position.set(1, 3, -1)
        this.wheelsFRShape = new CANNON.Sphere(0.33)
        this.wheelsFRBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsFRBody.addShape(this.wheelsFRShape)
        this.wheelsFRBody.position.copy(this.wheelsFR.position)
        this.world.addBody(this.wheelsFRBody)
        this.wheelsFRBody.angularDamping = 0.4
        this.wheelsFRBody.applyLocalForce = 20
        this.objectsToUpdate.push({
            mesh: this.wheelsFR,
            body: this.wheelsFRBody
        })

        //Left Back Wheel
        this.wheelsBL = new THREE.Mesh(this.wheelGeometry, this.material)
        this.scene.add(this.wheelsBL)
        this.wheelsBL.position.set(-1, 3, 1)
        this.wheelsBLShape = new CANNON.Sphere(0.4)
        this.wheelsBLBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsBLBody.addShape(this.wheelsBLShape)
        this.wheelsBLBody.position.copy(this.wheelsBL.position)
        this.world.addBody(this.wheelsBLBody)
        this.wheelsBLBody.angularDamping = 0.4
        this.objectsToUpdate.push({
            mesh: this.wheelsBL,
            body: this.wheelsBLBody
        })

        //Right Back Wheel
        this.wheelsBR = new THREE.Mesh(this.wheelGeometry, this.material)
        this.scene.add(this.wheelsBR)
        this.wheelsBR.position.set(1, 3, 1)
        this.wheelsBRShape = new CANNON.Sphere(0.4)
        //this.wheelsBRShape = new CANNON.Cylinder(0.4, 0.4, 0.4)
        this.wheelsBRBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsBRBody.addShape(this.wheelsBRShape)
        this.wheelsBRBody.position.copy(this.wheelsBR.position)
        this.world.addBody(this.wheelsBRBody)
        this.wheelsBRBody.angularDamping = 0.4
        this.objectsToUpdate.push({
            mesh: this.wheelsBR,
            body: this.wheelsBRBody
        })

        //constraints
        this.FLaxis = new CANNON.Vec3(1, 0, 0)
        this.FRaxis = new CANNON.Vec3(1, 0, 0)
        this.BLaxis = new CANNON.Vec3(1, 0, 0)
        this.BRaxis = new CANNON.Vec3(1, 0, 0)
        this.constraintFL = new CANNON.HingeConstraint(this.carBody, this.wheelsFLBody, {
            pivotA: new CANNON.Vec3(-0.75, -0.5, -1),
            axisA: this.FLaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintFL)

        this.constraintFR = new CANNON.HingeConstraint(this.carBody, this.wheelsFRBody, {
            pivotA: new CANNON.Vec3(0.75, -0.5, -1),
            axisA: this.FRaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintFR)

        this.constraintBL = new CANNON.HingeConstraint(this.carBody, this.wheelsBLBody, {
            pivotA: new CANNON.Vec3(-0.75, -0.5, 1),
            axisA: this.BLaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintBL)

        this.constraintBR = new CANNON.HingeConstraint(this.carBody, this.wheelsBRBody, {
            pivotA: new CANNON.Vec3(0.75, -0.5, 1),
            axisA: this.BRaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintBR)

        this.constraintBL.enableMotor()
        this.constraintBR.enableMotor()
        this.constraintFL.enableMotor()
        this.constraintFR.enableMotor()
    }


    JoyStick(){
        this.circle = document.querySelector('.circle')
        this.thumb = document.querySelector('.dots')
        this.position = this.thumb.getBoundingClientRect();
        this.control = document.querySelectorAll('.dot')
        //console.log(this.position.bottom)
        //console.log(window.innerHeight)
        if(this.hoverMap === true){
            console.log('forward')
        }
    }
        

    InitRenderer(){
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        })
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.render(this.scene, this.camera)
    }

    InitCamera(){
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
        this.camera.position.set(0, 1 ,5 )
        this.scene.add(this.camera)
        this.chaseCam = new THREE.Object3D()
        this.chaseCam.position.set(0, 0, 0)
        this.chaseCamPivot = new THREE.Object3D()
        this.chaseCamPivot.position.set(0, 2, 4)
        this.chaseCam.add(this.chaseCamPivot)
        this.scene.add(this.chaseCam)
    }

    InitLights(){
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        this.scene.add(this.ambientLight)
    }

    InitControls(){
        this.controls = new OrbitControls(this.camera, canvas)
        this.controls.enableDamping = true
        this.controls.update()
    }

    Resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.JoyStick()
    }

    Update(){
        requestAnimationFrame(() => {
            this.stats.begin()
            this.elapsedTime = this.clock.getElapsedTime()
            this.deltaTime = this.elapsedTime - this.oldElapsedTime
            this.oldElapsedTime = this.elapsedTime
            this.world.step(1/75, this.deltaTime, 3)

            this.camera.lookAt(this.group.position)

            this.chaseCamPivot.getWorldPosition(this.v)
            if (this.v.y < 1){
                this.v.y = 1
            }
            this.camera.position.lerpVectors(this.camera.position, this.v, 0.1)

            for(this.object of this.objectsToUpdate){
                this.object.mesh.position.copy(this.object.body.position)
                this.object.mesh.quaternion.copy(this.object.body.quaternion)
            }
            this.thrusting = false
            
            
            if (this.keyMap['w'] || this.hoverMap['3']  || this.hoverTouch['3']|| this.keyMap['ArrowUp']){
                if(this.forwardVel < 45.0){
                    this.forwardVel += 1
                    this.thrusting = true
                } 
            }

            if (this.keyMap['s'] || this.hoverMap['4'] || this.hoverTouch['4'] || this.keyMap['ArrowDown']){
                if(this.forwardVel > -35.0){
                    this.forwardVel -= 1
                    this.thrusting = true 
                } 
            }

            if (this.keyMap['a'] || this.hoverMap['1'] || this.hoverTouch['1']|| this.keyMap['ArrowLeft']){
                if(this.rightVel > -0.5){
                   // this.forwardVel += 0.5
                   // this.thrusting = true
                    this.rightVel -= 0.025
                } 
            }

            if (this.keyMap['d'] || this.hoverMap['2'] || this.hoverTouch['2']|| this.keyMap['ArrowRight']){
                if(this.rightVel < 0.5){
                    //this.forwardVel += 0.5
                   // this.thrusting = true
                    this.rightVel += 0.025
                } 
            }
            if (this.keyMap[' ']){
                if(this.forwardVel > 0){
                    this.forwardVel -= 1
                }
                if(this.forwardVel < 0){
                    this.forwardVel += 1
                }
            }

            if (!this.thrusting || !this.getPos){
                if (this.forwardVel > 0){
                    this.forwardVel -= 0.25
                }
                if(this.forwardVel < 0){
                    this.forwardVel += 0.25
                }
                if(this.rightVel > 0){
                    this.rightVel -= 0.01
                }
                if(this.rightVel < 0){
                    this.rightVel += 0.01
                }
            }

            this.constraintBL.setMotorSpeed(this.forwardVel)
            this.constraintBR.setMotorSpeed(this.forwardVel)
            this.constraintFL.setMotorSpeed(this.forwardVel)
            this.constraintFR.setMotorSpeed(this.forwardVel)
            this.constraintFL.axisA.z = this.rightVel
            this.constraintFR.axisA.z = this.rightVel
            this.renderer.render(this.scene, this.camera)
            //this.controls.update()
            //console.log(this.mouse.x, this.mouse.y)
            this.stats.end()
            this.Update()
        })  
    }
}

let _APP = null

window.addEventListener('DOMContentLoaded', () => {
    _APP = new Scene()
})