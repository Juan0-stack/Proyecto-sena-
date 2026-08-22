-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 11-08-2026 a las 21:47:17
-- Versión del servidor: 10.4.22-MariaDB
-- Versión de PHP: 7.4.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `isailo_maps`-s
--
-- PAPU BASE DE DATOS V 0.2 21/8/26

-- --------------------------------------------------------
-- ESTRUCTURAS TABLAS 
-- --------------------------------------------------------

-- Estructura de tabla para la tabla `espacio`


CREATE TABLE `espacio` (
  `id_espacio` int(11) NOT NULL,
  `nombre` varchar(50) not NULL,
  `funcion` varchar(200) DEFAULT NULL,
  `descripicion` varchar(200) default null,
  `capacidad` int(11) not NULL,
  `estado` varchar(200) DEFAULT NULL,
  `id_tipo_espacio_fk` int(11) not null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- Estructura de tabla para la tabla `evento`


CREATE TABLE `evento` (
  `id_evento` int(11) NOT NULL ,
  `nombre` varchar(50) not NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `aforo` int(11) not NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `hora_inicio` time default null,
  `hora_final` time default null,
  `estado` varchar(50) DEFAULT NULL,
  `id_usuario_fk` int(11) not NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Estructura de tabla para la tabla `reserva`


CREATE TABLE `reserva` (
  `id_reserva` int(11) NOT NULL ,
  `estado` enum('activa','inactiva') not null,
  `motivo_eliminacion` varchar(400) DEFAULT NULL,
  `id_solicitud_fk` int(11) not NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Estructura de tabla para la tabla `roles`


CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL ,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Estructura de tabla para la tabla `solicitud`


CREATE TABLE `solicitud` (
  `id_solicitud` int(11) NOT NULL ,
  `fecha_solicitud` date not NULL,
  `fecha_uso` date not NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `cantidad_personas` int(11) DEFAULT NULL,
  `nombre_actividad` varchar(50) not NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `estado` enum('sin_verificar','verificada','inactiva') not NULL,
  `id_usuario_fk` int(11) not NULL,
  `id_espacio_fk` int(11) not NULL,
  `motivo_eliminacion` varchar(400) default null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Estructura de tabla para la tabla `usuarios`


CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL ,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) not NULL,
  `correo` varchar(100) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo' not null,
  `id_rol_fk` int(11) default NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- tabla notificacion
create table `notificacion`(
  `id_notificacion` int(11) not null,
  `titulo` varchar(50) not null,
  `mensaje` varchar(100) not null,
  `tipo` enum('administrativa','docencia','general') not null,
  `fecha` datetime not null,
  `leida` enum('si','no') not null,
  `id_usuario_fk` int(11) not null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- tabla permisos
 create table `permisos`(
  `id_permiso` int not null,
  `nombre` varchar(50) not null,
  `descripcion` varchar(200) default null
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- tabla reporte daño

create table `reporte_daño`(
  `id_reporte` int(11) not null,
  `descripcion` varchar(250) default null,
  `fecha_reporte` datetime not null,
  `estado` enum('n/visto','visto','solucionado') not null,
  `id_reserva_fk` int(11) not null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- tabla tipo espacio
create table `tipo_espacio`(
  `id_tipo_espacio` int(11) not null,
  `nombre` varchar(50) not null,
  `descripcion` varchar(200) default null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----TABLAS N:M---------

-- tabla rol-permiso
create table `rol_permiso`(
  `id_rol_fk` int(11) not null,
  `id_permiso_fk` int(11) not null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- tabla espacio-evento
create table `espacio_evento`(
  `id_espacio_fk` int(11) not null,
  `id_evento_fk` int(11) not null
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- tabla usuario-espacio
create table `usuario_espacio`(
  `id_usuario_fk` int(11) not null,
  `id_espacio_fk` int(11) not null
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ------------------------------------------
-- INDICES??
-- ------------------------------------------

-- Indices de la tabla `espacio` 


alter table `espacio`
 add primary key (`id_espacio`),
 add key `id_tipo_espacio_fk` (`id_tipo_espacio_fk`);

-- Indices de la tabla `evento`

ALTER TABLE `evento`
  ADD PRIMARY KEY (`id_evento`),
  ADD KEY `id_usuario_fk` (`id_usuario_fk`);

--
-- Indices de la tabla `reserva`
--
ALTER TABLE `reserva`
  ADD PRIMARY KEY (`id_reserva`),
  ADD KEY `id_solicitud_fk` (`id_solicitud_fk`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `solicitud`
--
ALTER TABLE `solicitud`
  ADD PRIMARY KEY (`id_solicitud`),
  ADD KEY `id_usuario_fk` (`id_usuario_fk`),
  ADD KEY `id_espacio_fk` (`id_espacio_fk`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `id_rol_fk` (`id_rol_fk`);

-- indices notificacion

alter table `notificacion`
  add primary key (`id_notificacion`),
  add key `id_usuario_fk` (`id_usuario_fk`);

-- indice permisos
alter table `permisos`
  add primary key (`id_permiso`);

-- indices reporte daño
alter table `reporte_daño`
  add primary key (`id_reporte`),
  add key `id_reserva_fk` (`id_reserva_fk`);

-- indice tipo espacio
alter table `tipo_espacio`
   add primary key (`id_tipo_espacio`);

-- ----INDICES TABLAS N:M---------

-- indices rol-permiso
alter table `rol_permiso`
  add key `id_rol_fk` (`id_rol_fk`),
  add key `id_permiso_fk` (`id_permiso_fk`);

-- indices espacio-evento
alter table `espacio_evento`
  add key `id_espacio_fk` (`id_espacio_fk`),
  add key `id_evento_fk` (`id_evento_fk`);
  
-- indices usuario-espacio

alter table `usuario_espacio`
  add key `id_usuario_fk` (`id_usuario_fk`),
  add key `id_espacio_fk` (`id_espacio_fk`);


-- --------------------------------------------
-- AUTO_INCREMENT TABLAS
-- -------------------------------------------

-- AUTO_INCREMENT de la tabla `espacio`

ALTER TABLE `espacio`
  MODIFY `id_espacio` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT de la tabla `evento`

ALTER TABLE `evento`
  MODIFY `id_evento` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT de la tabla `reserva`

ALTER TABLE `reserva`
  MODIFY `id_reserva` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT de la tabla `roles`

ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT de la tabla `solicitud`

ALTER TABLE `solicitud`
  MODIFY `id_solicitud` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT de la tabla `usuarios`

ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT;

-- auto increment notificacion
ALTER TABLE `notificacion`
  MODIFY `id_notificacion` int(11) NOT NULL AUTO_INCREMENT;

-- auto increment permisos
ALTER TABLE `permisos`
  MODIFY `id_permiso` int(11) NOT NULL AUTO_INCREMENT;

-- auto increment reporte_daño
ALTER TABLE `reporte_daño`
  MODIFY `id_reporte` int(11) NOT NULL AUTO_INCREMENT;

-- auto increment tipo_espacio
ALTER TABLE `tipo_espacio`
  MODIFY `id_tipo_espacio` int(11) NOT NULL AUTO_INCREMENT;
-- ---------------------------------------------------------


-- Restricciones para tablas volcadas

-- alter table espacio
ALTER TABLE `espacio`
  ADD CONSTRAINT `espacio_ibfk_1` FOREIGN KEY (`id_tipo_espacio_fk`) REFERENCES tipo_espacio (`id_tipo_espacio`);
  

-- Filtros para la tabla `evento`
--
ALTER TABLE `evento`
  ADD CONSTRAINT `evento_ibfk_1` FOREIGN KEY (`id_usuario_fk`) REFERENCES `usuarios` (`id_usuario`);
--
-- Filtros para la tabla `reserva`
--
ALTER TABLE `reserva`
  ADD CONSTRAINT `reserva_ibfk_1` FOREIGN KEY (`id_solicitud_fk`) REFERENCES `solicitud` (`id_solicitud`);

-- Filtros para la tabla `solicitud`
--
ALTER TABLE `solicitud`
  ADD CONSTRAINT `solicitud_ibfk_1` FOREIGN KEY (`id_usuario_fk`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `solicitud_ibfk_2` FOREIGN KEY (`id_espacio_fk`) REFERENCES `espacio` (`id_espacio`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol_fk`) REFERENCES `roles` (`id_rol`);

-- filtros notificacion

ALTER TABLE `notificacion`
  ADD CONSTRAINT `notificacion_ibfk_1` FOREIGN KEY (`id_usuario_fk`) REFERENCES `usuarios` (`id_usuario`);

-- flitros reporte daño
ALTER TABLE `reporte_daño`
  ADD CONSTRAINT `reporte_daño_ibfk_1` FOREIGN KEY (`id_reserva_fk`) REFERENCES `reserva` (`id_reserva`);

-- filtros rol-permiso
ALTER TABLE `rol_permiso`
  ADD CONSTRAINT `rol_permiso_ibfk_1` FOREIGN KEY (`id_rol_fk`) REFERENCES `roles` (`id_rol`),
  ADD CONSTRAINT `rol_permiso_ibfk_2` FOREIGN KEY (`id_permiso_fk`) REFERENCES `permisos` (`id_permiso`);

-- filtros espacio-evento
ALTER TABLE `espacio_evento`
  ADD CONSTRAINT `espacio_evento_ibfk_1` FOREIGN KEY (`id_espacio_fk`) REFERENCES `espacio` (`id_espacio`),
  ADD CONSTRAINT `espacio_evento_ibfk_2` FOREIGN KEY (`id_evento_fk`) REFERENCES `evento` (`id_evento`);

-- filtros usuario-espacio
ALTER TABLE `usuario_espacio`
  ADD CONSTRAINT `usuario_espacio_ibfk_1` FOREIGN KEY (`id_usuario_fk`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `usuario_espacio_ibfk_2` FOREIGN KEY (`id_espacio_fk`) REFERENCES `espacio` (`id_espacio`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
