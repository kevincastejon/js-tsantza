import { ipcRenderer, remote } from 'electron';
import { withTheme } from '@material-ui/core/styles';
import '../assets/css/App.css';
import React, { Component } from 'react';
import path from 'path';

import {
  Snackbar,
  GridList,
  GridListTile,
  Backdrop,
  CircularProgress,
  IconButton,
  GridListTileBar,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Button,
  Grid,
} from '@material-ui/core';
import {
  FolderOpen, DeleteForever, Close, AddAPhoto,
} from '@material-ui/icons';
import MuiAlert from '@material-ui/lab/Alert';
import logo from '../assets/img/logo.png';

const { dialog } = remote;
function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: [],
      loading: false,
      outputType: 'original',
      outputPath: null,
      maxWidth: 1920,
      maxHeight: 1080,
      sizePreset: 'fullhd',
      conversion: 'none',
      notif: false,
      notifMessage: null,
      notifType: null,
    };
    this.addFilesButton = React.createRef();
    this.selectDirButton = React.createRef();
  }

  componentDidMount() {
    ipcRenderer.on('onImagesAdded', (e, addedImages) => this.onImagesAdded(addedImages));
    ipcRenderer.on('onResized', () => this.setState({
      notif: true, notifType: 'success', notifMessage: 'Images traitées!', loading: false, images: [],
    }));
    ipcRenderer.on('open', () => {
      this.addFilesButton.click();
    });
  }

  onImagesAdded(addedImages) {
    const { images } = this.state;
    this.setState({ images: images.concat(addedImages.filter((el) => images.findIndex((e) => e.path === el.path) === -1)), loading: false });
  }

  addImages(images) {
    if (images.length === 0) {
      return;
    }
    const ar = [];
    for (let i = 0; i < images.length; i += 1) {
      if (images[i].type.substring(0, 5) === 'image') {
        ar.push(images[i].path);
      }
    }
    if (ar.length > 0) {
      this.setState({ loading: true });
      ipcRenderer.send('onAddImages', ar);
    }
  }


  render() {
    const {
      images, loading, outputType, maxWidth, maxHeight, sizePreset, outputPath, conversion, notif, notifType, notifMessage,
    } = this.state;
    const { theme } = this.props;
    return (
      <div
        style={{ textAlign: 'center' }}
        onDragOver={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          this.addImages(event.dataTransfer.files);
        }}
      >
        {!notif ? null : (
          <Snackbar
            open={notif}
            autoHideDuration={3000}
            onClose={() => this.setState({ notif: false, notifType: null, notifMessage: null })}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            action={(
              <div>
                <IconButton size="small" aria-label="close" color="inherit" onClick={() => this.setState({ notif: false, notifType: null, notifMessage: null })}>
                  <Close fontSize="small" />
                </IconButton>
              </div>
            )}
          >
            <Alert severity={notifType}>
              {notifMessage}
            </Alert>
          </Snackbar>
        )}
        <Backdrop
          style={{
            zIndex: theme.zIndex.drawer + 1,
            color: '#fff',
          }}
          open={loading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        <img
          src={logo}
          alt="logo"
        />
        <div style={{
          margin: 'auto',
        }}
        >
          <p>
            <Button style={{ color: 'green' }} onClick={() => this.addFilesButton.click()} startIcon={<AddAPhoto />}>
              Ajouter des images
            </Button>
            ou glissez-déposez les dans la fenetre
            <input
              ref={(el) => { this.addFilesButton = el; }}
              style={{
                display: 'none',
              }}
              id="file-button"
              type="file"
              multiple
              accept="image/jpeg, image/png, image/webp"
              onChange={(e) => {
                this.addImages(e.target.files);
                e.target.value = '';
              }}
            />
          </p>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-around',
          overflow: 'hidden',
          backgroundColor: theme.palette.background.paper,
          minHeight: 190,
          borderStyle: 'solid',
        }}
        >
          <GridList
            style={{
              flexWrap: 'nowrap',
              transform: 'translateZ(0)',
            }}
            cols={2.5}
          >
            {images.map((img) => (
              <GridListTile key={path.basename(img.path)}>
                <img src={img.base64} alt={path.basename(img.path)} />
                <GridListTileBar
                  title={path.basename(img.path)}
                  actionIcon={(
                    <IconButton
                      aria-label="delete"
                      onClick={() => {
                        this.setState({ images: images.filter((el) => el.path !== img.path) });
                      }}
                    >
                      <DeleteForever style={{ color: 'white' }} />
                    </IconButton>
                  )}
                />
              </GridListTile>
            ))}
          </GridList>
        </div>
        <div style={{
          width: '90%',
          margin: 'auto',
          marginTop: 10,
          textAlign: 'center',
        }}
        >
          <Grid container spacing={4} alignItems="center" justify="center">
            <Grid item>
              <FormControl component="fieldset">
                <FormLabel component="legend">Type de sortie</FormLabel>
                <RadioGroup
                  aria-label="radioGroup"
                  name="radioGroup1"
                  value={outputType}
                  onChange={(e) => {
                    const { value } = e.target;
                    this.setState({ outputType: value }, () => {
                      if (value === 'folder' && outputPath === null) {
                        this.selectDirButton.click();
                      }
                    });
                  }}
                >
                  <FormControlLabel value="original" control={<Radio color="primary" />} label="Remplacer les fichiers originaux" />
                  <FormControlLabel value="folder" control={<Radio color="primary" />} label="Selectionner un dossier" />
                  {outputType !== 'folder' ? null : (
                    <div style={{ textAlign: 'left' }}>
                      <IconButton
                        ref={(el) => { this.selectDirButton = el; }}
                        aria-label="open"
                        onClick={() => {
                          this.setState({ loading: true });
                          dialog.showOpenDialog({
                            properties: ['openDirectory'],
                          }).then((obj) => {
                            if (!obj.canceled) {
                              this.setState({ loading: false, outputPath: obj.filePaths[0] });
                            } else {
                              this.setState({ loading: false, outputType: 'original' });
                            }
                          });
                        }}
                      >
                        <FolderOpen />
                      </IconButton>
                      {outputPath === null ? null : <span title={outputPath}>{`${outputPath.substring(0, 20)}...`}</span>}
                    </div>
                  )}
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item>
              <FormControl component="fieldset">
                <FormLabel component="legend">Conversion</FormLabel>
                <RadioGroup
                  aria-label="conversion"
                  name="conversion"
                  value={conversion}
                  onChange={(e) => {
                    this.setState({ conversion: e.target.value });
                  }}
                >
                  <FormControlLabel value="none" control={<Radio color="primary" />} label="None" />
                  <FormControlLabel value="jpeg" control={<Radio color="primary" />} label="JPG" />
                  <FormControlLabel value="png" control={<Radio color="primary" />} label="PNG" />
                  <FormControlLabel value="webp" control={<Radio color="primary" />} label="WEBP" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item>
              <FormControl component="fieldset">
                <FormLabel component="legend">Redimensionnement</FormLabel>
                <RadioGroup
                  aria-label="radioGroup"
                  name="radioGroup1"
                  value={sizePreset}
                  onChange={(e) => {
                    let w = maxWidth;
                    let h = maxHeight;
                    if (e.target.value === 'fullhd') {
                      w = 1920;
                      h = 1080;
                    } else if (e.target.value === 'hdready') {
                      w = 1280;
                      h = 720;
                    }
                    this.setState({ sizePreset: e.target.value, maxWidth: w, maxHeight: h });
                  }}
                >
                  <FormControlLabel value="fullhd" control={<Radio color="primary" />} label="FULL HD (1080p)" />
                  <FormControlLabel value="hdready" control={<Radio color="primary" />} label="HD READY (720p)" />
                  <FormControlLabel value="custom" control={<Radio color="primary" />} label="Personnalisé" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item>
              <div>
                <TextField
                  disabled={sizePreset !== 'custom'}
                  style={{ width: 100 }}
                  id="maxWidthInput"
                  label="Max-largeur"
                  type="number"
                  value={maxWidth}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(e) => this.setState({ maxWidth: parseInt(e.target.value, 10) })}
                />
                <br />
                <TextField
                  disabled={sizePreset !== 'custom'}
                  style={{ width: 100 }}
                  id="maxHeightInput"
                  label="Max-hauteur"
                  type="number"
                  value={maxHeight}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(e) => this.setState({ maxHeight: parseInt(e.target.value, 10) })}
                />
              </div>
            </Grid>
          </Grid>
          <hr />
          <Button
            style={{
              marginTop: 15,
            }}
            disabled={images.length === 0}
            variant="contained"
            color="primary"
            onClick={() => {
              this.setState({ loading: true });
              ipcRenderer.send('onResize', images, maxWidth, maxHeight, outputType, outputType === 'folder' ? outputPath : null, conversion);
            }}
          >
            Traiter!
          </Button>
        </div>
      </div>
    );
  }
}

export default withTheme(App);
